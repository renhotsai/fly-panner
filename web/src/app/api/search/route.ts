import { NextRequest, NextResponse } from "next/server";
import { searchFlights } from "@/lib/duffel";
import { dateRange } from "@/lib/dateRange";
import type { FlightOffer, SearchParams, SearchResponse } from "@/lib/types";

const MAX_COMBINATIONS = 50;
const MAX_WORKERS = 4;

async function pool<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = [];
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, worker)
  );
  return results;
}

export async function POST(req: NextRequest) {
  let params: SearchParams;
  try {
    params = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const apiKey = process.env.DUFFEL_API_KEY ?? "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "Duffel API key is not configured on the server." },
      { status: 500 }
    );
  }

  // Build date pairs (Duffel requires specific dates, not ranges)
  const isRoundTrip = !!params.returnFrom;
  const datePairs: { dep: string; ret?: string }[] = [];

  for (const dep of dateRange(params.departFrom, params.departTo)) {
    if (!isRoundTrip) {
      datePairs.push({ dep });
    } else {
      for (const ret of dateRange(params.returnFrom, params.returnTo)) {
        if (ret >= dep) datePairs.push({ dep, ret });
      }
    }
  }

  const combinations = datePairs.length;
  if (combinations > MAX_COMBINATIONS) {
    return NextResponse.json(
      {
        error: `Search would require ${combinations} API calls (max ${MAX_COMBINATIONS}). Please narrow your date range.`,
      },
      { status: 400 }
    );
  }

  const tasks = datePairs.map(({ dep, ret }) => async () => {
    try {
      return await searchFlights({
        apiKey,
        origin: params.origin,
        destination: params.destination,
        departureDate: dep,
        returnDate: ret,
        adults: params.adults,
        currency: params.currency,
        nonStop: params.nonStop,
      });
    } catch {
      return [] as FlightOffer[];
    }
  });

  const nested = await pool(tasks, MAX_WORKERS);
  const allOffers = nested.flat().sort((a, b) => a.price - b.price);
  const topOffers = allOffers.slice(0, params.topN);

  const response: SearchResponse = { offers: topOffers, combinations };
  return NextResponse.json(response);
}
