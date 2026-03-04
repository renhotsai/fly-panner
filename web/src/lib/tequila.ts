/**
 * Minimal Kiwi.com Tequila REST client for flight offer searches.
 * Authentication: apikey header (no OAuth2 required).
 */

import type { AirportOption, FlightItinerary, FlightOffer, FlightSegment } from "./types";

const BASE_URL = "https://tequila-api.kiwi.com";
const SEARCH_URL = `${BASE_URL}/v2/search`;
const LOCATIONS_URL = `${BASE_URL}/locations/query`;

/** Convert YYYY-MM-DD → dd/mm/yyyy (Tequila date format) */
function toTequilaDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

/** Calculate duration in minutes between two ISO datetime strings */
function calcDurationMinutes(dep: string, arr: string): number {
  return Math.round((new Date(arr).getTime() - new Date(dep).getTime()) / 60_000);
}

interface TequilaRoute {
  flyFrom: string;
  flyTo: string;
  local_departure: string;
  local_arrival: string;
  airline: string;
  flight_no: number | string;
  return: number; // 0 = outbound, 1 = inbound
}

interface TequilaOffer {
  price: number;
  fly_from: string;
  fly_to: string;
  local_departure: string;
  local_arrival: string;
  duration: {
    departure: number; // seconds
    return: number;    // seconds
    total: number;
  };
  nightsInDest?: number;
  route: TequilaRoute[];
}

function parseItinerary(
  routes: TequilaRoute[],
  durationSecs: number
): FlightItinerary {
  const segments: FlightSegment[] = routes.map((r) => ({
    departureAirport: r.flyFrom,
    arrivalAirport: r.flyTo,
    departureTime: r.local_departure,
    arrivalTime: r.local_arrival,
    carrier: r.airline,
    flightNumber: String(r.flight_no),
    durationMinutes: calcDurationMinutes(r.local_departure, r.local_arrival),
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
    totalDurationMinutes: Math.max(Math.round(durationSecs / 60), 1),
    carriers,
    segments,
  };
}

function parseOffer(raw: TequilaOffer, currency: string): FlightOffer {
  const outboundRoutes = raw.route.filter((r) => r.return === 0);
  const inboundRoutes = raw.route.filter((r) => r.return === 1);

  const outbound = parseItinerary(outboundRoutes, raw.duration.departure);
  const inbound =
    inboundRoutes.length > 0
      ? parseItinerary(inboundRoutes, raw.duration.return)
      : null;

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

export async function searchAirports(params: {
  apiKey: string;
  keyword: string;
}): Promise<AirportOption[]> {
  const query = new URLSearchParams({
    term: params.keyword,
    location_types: "airport",
    limit: "8",
  });

  const res = await fetch(`${LOCATIONS_URL}?${query}`, {
    headers: { apikey: params.apiKey },
  });

  if (!res.ok) return [];
  const data = await res.json() as { locations?: Record<string, unknown>[] };
  return (data.locations ?? []).map((loc) => {
    const city = loc.city as Record<string, string> | undefined;
    const country = loc.country as Record<string, string> | undefined;
    return {
      iataCode: loc.code as string,
      name: loc.name as string,
      cityName: city?.name ?? (loc.name as string),
      countryCode: country?.code ?? "",
    };
  });
}

export async function searchFlights(params: {
  apiKey: string;
  origin: string;
  destination: string;
  departFrom: string;
  departTo: string;
  returnFrom?: string;
  returnTo?: string;
  adults?: number;
  currency?: string;
  limit?: number;
  nonStop?: boolean;
}): Promise<FlightOffer[]> {
  const currency = params.currency ?? "USD";

  const query = new URLSearchParams({
    fly_from: params.origin.toUpperCase(),
    fly_to: params.destination.toUpperCase(),
    date_from: toTequilaDate(params.departFrom),
    date_to: toTequilaDate(params.departTo),
    adults: String(params.adults ?? 1),
    curr: currency,
    limit: String(params.limit ?? 200),
    sort: "price",
    asc: "1",
  });

  if (params.returnFrom && params.returnTo) {
    query.set("return_from", toTequilaDate(params.returnFrom));
    query.set("return_to", toTequilaDate(params.returnTo));
    query.set("flight_type", "round");
  } else {
    query.set("flight_type", "oneway");
  }

  if (params.nonStop) {
    query.set("max_stopovers", "0");
  }

  const res = await fetch(`${SEARCH_URL}?${query}`, {
    headers: { apikey: params.apiKey },
  });

  if (!res.ok) {
    if (res.status === 400 || res.status === 404) return [];
    const text = await res.text();
    throw new Error(`Tequila search failed (${res.status}): ${text}`);
  }

  const data = await res.json() as { data?: TequilaOffer[] };
  return (data.data ?? [])
    .map((item) => parseOffer(item, currency))
    .sort((a, b) => a.price - b.price);
}
