/**
 * Duffel Air API client for flight offer searches.
 * Docs: https://duffel.com/docs/api/v2/offer-requests
 *
 * NOTE: Sandbox environment only returns Duffel Airways (ZZ) dummy data.
 * Live access requires approval from Duffel — apply at duffel.com/dashboard.
 */

import type { FlightItinerary, FlightOffer, FlightSegment } from "./types";

const BASE_URL = "https://api.duffel.com";

// Parse ISO 8601 duration (e.g. "PT7H35M") to minutes
function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  return parseInt(match[1] ?? "0") * 60 + parseInt(match[2] ?? "0");
}

interface DuffelAirport {
  iata_code: string;
  name: string;
}

interface DuffelSegment {
  departing_at: string;
  arriving_at: string;
  origin: DuffelAirport;
  destination: DuffelAirport;
  marketing_carrier: { iata_code: string; name: string };
  marketing_carrier_flight_number: string;
  duration: string;
}

interface DuffelSlice {
  origin: DuffelAirport;
  destination: DuffelAirport;
  duration: string;
  segments: DuffelSegment[];
}

interface DuffelOffer {
  id: string;
  total_amount: string;
  total_currency: string;
  slices: DuffelSlice[];
}

function buildItinerary(slice: DuffelSlice): FlightItinerary {
  const segments: FlightSegment[] = slice.segments.map((seg) => ({
    departureAirport: seg.origin.iata_code,
    arrivalAirport: seg.destination.iata_code,
    departureTime: seg.departing_at,
    arrivalTime: seg.arriving_at,
    carrier: seg.marketing_carrier.name,
    flightNumber: seg.marketing_carrier_flight_number ?? "",
    durationMinutes: parseDuration(seg.duration),
  }));

  const first = segments[0];
  const last = segments[segments.length - 1];
  const carriers = [...new Set(segments.map((s) => s.carrier))];

  return {
    origin: first.departureAirport,
    destination: last.arrivalAirport,
    departureDate: first.departureTime.slice(0, 10),
    arrivalDate: last.arrivalTime.slice(0, 10),
    stops: segments.length - 1,
    totalDurationMinutes: parseDuration(slice.duration),
    carriers,
    segments,
  };
}

function parseOffer(offer: DuffelOffer): FlightOffer {
  const price = parseFloat(offer.total_amount);
  const currency = offer.total_currency;
  const outbound = buildItinerary(offer.slices[0]);
  const inbound = offer.slices[1] ? buildItinerary(offer.slices[1]) : null;

  const returnDate = inbound ? inbound.departureDate : null;
  let tripDurationDays: number | null = null;
  if (returnDate) {
    const dep = new Date(outbound.departureDate);
    const ret = new Date(returnDate);
    tripDurationDays = Math.round((ret.getTime() - dep.getTime()) / 86_400_000);
  }

  return {
    price,
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
  currency?: string;
  nonStop?: boolean;
}): Promise<FlightOffer[]> {
  const adults = params.adults ?? 1;
  const passengers = Array.from({ length: adults }, () => ({ type: "adult" }));

  const sliceBase = params.nonStop ? { max_connections: 0 } : {};

  const slices = [
    {
      origin: params.origin.toUpperCase(),
      destination: params.destination.toUpperCase(),
      departure_date: params.departureDate,
      ...sliceBase,
    },
    ...(params.returnDate
      ? [
          {
            origin: params.destination.toUpperCase(),
            destination: params.origin.toUpperCase(),
            departure_date: params.returnDate,
            ...sliceBase,
          },
        ]
      : []),
  ];

  const res = await fetch(`${BASE_URL}/air/offer_requests?return_offers=true`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Duffel-Version": "v2",
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ data: { slices, passengers, cabin_class: "economy" } }),
  });

  if (!res.ok) {
    // 422 = no routes available for this route/date
    if (res.status === 422) return [];
    const text = await res.text();
    throw new Error(`Duffel search failed (${res.status}): ${text}`);
  }

  const json = await res.json() as {
    data: { offers: DuffelOffer[] };
    errors?: { message: string }[];
  };

  if (json.errors?.length) {
    throw new Error(`Duffel error: ${json.errors[0].message}`);
  }

  return (json.data.offers ?? [])
    .map(parseOffer)
    .sort((a, b) => a.price - b.price);
}
