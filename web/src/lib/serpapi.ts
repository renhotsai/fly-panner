/**
 * SerpAPI Google Flights client for flight offer searches.
 * Docs: https://serpapi.com/google-flights-api
 */

import type { FlightItinerary, FlightOffer, FlightSegment } from "./types";

const SEARCH_URL = "https://serpapi.com/search.json";

interface SerpFlight {
  departure_airport: { id: string; name: string; time: string };
  arrival_airport: { id: string; name: string; time: string };
  duration: number; // minutes
  airline: string;
  flight_number: string;
}

interface SerpResult {
  flights: SerpFlight[];
  total_duration: number; // minutes
  price: number;
  type: string; // "Round trip" | "One way"
}

function calcDurationMinutes(dep: string, arr: string): number {
  return Math.round((new Date(arr).getTime() - new Date(dep).getTime()) / 60_000);
}

function buildItinerary(
  legs: SerpFlight[],
  overallDurationMinutes?: number
): FlightItinerary {
  const segments: FlightSegment[] = legs.map((f) => ({
    departureAirport: f.departure_airport.id,
    arrivalAirport: f.arrival_airport.id,
    departureTime: f.departure_airport.time,
    arrivalTime: f.arrival_airport.time,
    carrier: f.airline,
    flightNumber: f.flight_number ?? "",
    durationMinutes: f.duration,
  }));

  const first = segments[0];
  const last = segments[segments.length - 1];
  const carriers = [...new Set(segments.map((s) => s.carrier))];

  // Total duration = wall-clock time from first dep to last arr (includes layovers)
  const totalDurationMinutes =
    overallDurationMinutes ??
    calcDurationMinutes(first.departureTime, last.arrivalTime);

  return {
    origin: first.departureAirport,
    destination: last.arrivalAirport,
    departureDate: first.departureTime.slice(0, 10),
    arrivalDate: last.arrivalTime.slice(0, 10),
    stops: segments.length - 1,
    totalDurationMinutes,
    carriers,
    segments,
  };
}

function parseResult(
  raw: SerpResult,
  destination: string,
  currency: string
): FlightOffer {
  const isRoundTrip = raw.type === "Round trip";

  let outboundLegs: SerpFlight[];
  let inboundLegs: SerpFlight[];

  if (!isRoundTrip) {
    outboundLegs = raw.flights;
    inboundLegs = [];
  } else {
    // Split flights at the leg that arrives at destination
    const dest = destination.toUpperCase();
    const splitIdx = raw.flights.findIndex(
      (f) => f.arrival_airport.id.toUpperCase() === dest
    );
    if (splitIdx === -1) {
      // Fallback: treat all as outbound
      outboundLegs = raw.flights;
      inboundLegs = [];
    } else {
      outboundLegs = raw.flights.slice(0, splitIdx + 1);
      inboundLegs = raw.flights.slice(splitIdx + 1);
    }
  }

  const outbound = buildItinerary(outboundLegs);
  const inbound = inboundLegs.length > 0 ? buildItinerary(inboundLegs) : null;

  const returnDate = inbound ? inbound.departureDate : null;
  let tripDurationDays: number | null = null;
  if (returnDate) {
    const dep = new Date(outbound.departureDate);
    const ret = new Date(returnDate);
    tripDurationDays = Math.round((ret.getTime() - dep.getTime()) / 86_400_000);
  }

  return {
    price: raw.price,
    currency,
    departureDate: outbound.departureDate,
    returnDate,
    tripDurationDays,
    seatsRemaining: null,
    outbound,
    inbound,
  };
}

export async function searchFlights(params: {
  apiKey: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults?: number;
  bags?: number;
  currency?: string;
  nonStop?: boolean;
}): Promise<FlightOffer[]> {
  const currency = params.currency ?? "USD";

  const query = new URLSearchParams({
    engine: "google_flights",
    api_key: params.apiKey,
    departure_id: params.origin.toUpperCase(),
    arrival_id: params.destination.toUpperCase(),
    outbound_date: params.departureDate,
    adults: String(params.adults ?? 1),
    currency,
    type: params.returnDate ? "1" : "2", // 1=round trip, 2=one way
    sort_by: "2", // sort by price
  });

  if (params.returnDate) {
    query.set("return_date", params.returnDate);
  }
  if (params.nonStop) {
    query.set("stops", "1"); // 1 = nonstop only
  }
  if (params.bags && params.bags > 0) {
    query.set("bags", String(params.bags));
  }

  const res = await fetch(`${SEARCH_URL}?${query}`);

  if (!res.ok) {
    if (res.status === 400 || res.status === 404) return [];
    const text = await res.text();
    throw new Error(`SerpAPI search failed (${res.status}): ${text}`);
  }

  const data = await res.json() as {
    best_flights?: SerpResult[];
    other_flights?: SerpResult[];
    error?: string;
  };

  if (data.error) {
    throw new Error(`SerpAPI error: ${data.error}`);
  }

  const dest = params.destination.toUpperCase();
  const all = [...(data.best_flights ?? []), ...(data.other_flights ?? [])];
  return all
    .map((r) => parseResult(r, dest, currency))
    .sort((a, b) => a.price - b.price);
}
