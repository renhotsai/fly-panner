import { NextRequest, NextResponse } from "next/server";
import { searchFlights } from "@/lib/tequila";
import type { SearchParams, SearchResponse } from "@/lib/types";

export async function POST(req: NextRequest) {
  let params: SearchParams;
  try {
    params = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const apiKey = process.env.TEQUILA_API_KEY ?? "";
  if (!apiKey) {
    return NextResponse.json(
      { error: "Tequila API key is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const offers = await searchFlights({
      apiKey,
      origin: params.origin,
      destination: params.destination,
      departFrom: params.departFrom,
      departTo: params.departTo,
      returnFrom: params.returnFrom,
      returnTo: params.returnTo,
      adults: params.adults,
      currency: params.currency,
      limit: 200,
      nonStop: params.nonStop,
    });

    const topOffers = offers.slice(0, params.topN);
    const response: SearchResponse = { offers: topOffers, combinations: 1 };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
