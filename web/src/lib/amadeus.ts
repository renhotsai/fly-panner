/**
 * Minimal Amadeus REST client for flight offer searches.
 * Uses the OAuth2 client-credentials flow with an in-memory token cache.
 */

import type { AirportOption, FlightItinerary, FlightOffer, FlightSegment } from "./types";

const BASE_URL = "https://test.api.amadeus.com";
const TOKEN_URL = `${BASE_URL}/v1/security/oauth2/token`;
const SEARCH_URL = `${BASE_URL}/v2/shopping/flight-offers`;
const LOCATIONS_URL = `${BASE_URL}/v1/reference-data/locations`;

// Token cache (module-level, reused across requests within the same process)
let _cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(apiKey: string, apiSecret: string): Promise<string> {
  const now = Date.now();
  if (_cachedToken && _cachedToken.expiresAt > now + 30_000) {
    return _cachedToken.value;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: apiKey,
    client_secret: apiSecret,
  });

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Amadeus auth failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  _cachedToken = {
    value: data.access_token as string,
    expiresAt: now + (data.expires_in as number) * 1000,
  };
  return _cachedToken.value;
}

function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  return (parseInt(match[1] ?? "0") * 60) + parseInt(match[2] ?? "0");
}

function parseItinerary(raw: Record<string, unknown>): FlightItinerary {
  const segs = (raw.segments as Record<string, unknown>[]).map((seg) => {
    const dep = seg.departure as Record<string, string>;
    const arr = seg.arrival as Record<string, string>;
    const operating = (seg.operating ?? seg) as Record<string, string>;
    const duration = seg.duration as string;
    return {
      departureAirport: dep.iataCode,
      arrivalAirport: arr.iataCode,
      departureTime: dep.at,
      arrivalTime: arr.at,
      carrier: operating.carrierCode,
      flightNumber: seg.number as string,
      durationMinutes: parseDuration(duration),
    } satisfies FlightSegment;
  });

  const first = segs[0];
  const last = segs[segs.length - 1];
  const carriers = [...new Set(segs.map((s) => s.carrier))];

  return {
    origin: first.departureAirport,
    destination: last.arrivalAirport,
    departureDate: first.departureTime.slice(0, 10),
    arrivalDate: last.arrivalTime.slice(0, 10),
    stops: segs.length - 1,
    totalDurationMinutes: segs.reduce((sum, s) => sum + s.durationMinutes, 0),
    carriers,
    segments: segs,
  };
}

function parseOffer(raw: Record<string, unknown>): FlightOffer {
  const price = raw.price as Record<string, string>;
  const itineraries = (raw.itineraries as Record<string, unknown>[]).map(parseItinerary);
  const outbound = itineraries[0];
  const inbound = itineraries[1] ?? null;

  let seatsRemaining: number | null = null;
  const seats = raw.numberOfBookableSeats;
  if (typeof seats === "number") seatsRemaining = seats;
  else if (typeof seats === "string") seatsRemaining = parseInt(seats);

  const returnDate = inbound?.departureDate ?? null;
  let tripDurationDays: number | null = null;
  if (returnDate) {
    const dep = new Date(outbound.departureDate);
    const ret = new Date(returnDate);
    tripDurationDays = Math.round((ret.getTime() - dep.getTime()) / 86_400_000);
  }

  return {
    price: parseFloat(price.grandTotal),
    currency: price.currency,
    departureDate: outbound.departureDate,
    returnDate,
    tripDurationDays,
    seatsRemaining,
    outbound,
    inbound,
  };
}

export async function searchAirports(params: {
  apiKey: string;
  apiSecret: string;
  keyword: string;
}): Promise<AirportOption[]> {
  const token = await getAccessToken(params.apiKey, params.apiSecret);
  const query = new URLSearchParams({
    subType: "AIRPORT",
    keyword: params.keyword,
    "page[limit]": "8",
  });

  const res = await fetch(`${LOCATIONS_URL}?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return [];
  const data = await res.json() as { data?: Record<string, unknown>[] };
  return (data.data ?? []).map((loc) => {
    const addr = loc.address as Record<string, string>;
    return {
      iataCode: loc.iataCode as string,
      name: loc.name as string,
      cityName: addr.cityName ?? "",
      countryCode: addr.countryCode ?? "",
    };
  });
}

export async function searchFlights(params: {
  apiKey: string;
  apiSecret: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  currency: string;
  max?: number;
  nonStop?: boolean;
}): Promise<FlightOffer[]> {
  const token = await getAccessToken(params.apiKey, params.apiSecret);

  const query = new URLSearchParams({
    originLocationCode: params.origin.toUpperCase(),
    destinationLocationCode: params.destination.toUpperCase(),
    departureDate: params.departureDate,
    adults: String(params.adults),
    currencyCode: params.currency,
    max: String(params.max ?? 15),
  });
  if (params.returnDate) {
    query.set("returnDate", params.returnDate);
  }
  if (params.nonStop) {
    query.set("nonStop", "true");
  }

  const res = await fetch(`${SEARCH_URL}?${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    if (res.status === 400 || res.status === 404) return [];
    const text = await res.text();
    throw new Error(`Amadeus search failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  const offers = ((data.data as Record<string, unknown>[]) ?? []).map(parseOffer);
  return offers.sort((a, b) => a.price - b.price);
}
