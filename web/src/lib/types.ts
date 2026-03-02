export interface FlightSegment {
  departureAirport: string;
  arrivalAirport: string;
  departureTime: string;
  arrivalTime: string;
  carrier: string;
  flightNumber: string;
  durationMinutes: number;
}

export interface FlightItinerary {
  origin: string;
  destination: string;
  departureDate: string;
  arrivalDate: string;
  stops: number;
  totalDurationMinutes: number;
  carriers: string[];
  segments: FlightSegment[];
}

export interface FlightOffer {
  price: number;
  currency: string;
  departureDate: string;
  returnDate: string | null;
  tripDurationDays: number | null;
  seatsRemaining: number | null;
  outbound: FlightItinerary;
  inbound: FlightItinerary | null;
}

export interface SearchParams {
  origin: string;
  destination: string;
  departFrom: string;   // YYYY-MM-DD
  departTo: string;     // YYYY-MM-DD
  returnFrom: string;   // YYYY-MM-DD (empty = one-way)
  returnTo: string;     // YYYY-MM-DD (empty = one-way)
  adults: number;
  currency: string;
  topN: number;
}

export interface AirportOption {
  iataCode: string;
  name: string;       // "JOHN F KENNEDY INTL"
  cityName: string;   // "NEW YORK"
  countryCode: string; // "US"
}

export interface SearchResponse {
  offers: FlightOffer[];
  combinations: number;
  error?: string;
}
