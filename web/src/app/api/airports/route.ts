import { NextRequest, NextResponse } from "next/server";
import { searchAirports } from "@/lib/amadeus";

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword")?.trim() ?? "";
  if (keyword.length < 2) return NextResponse.json([]);

  const apiKey = process.env.AMADEUS_API_KEY ?? "";
  const apiSecret = process.env.AMADEUS_API_SECRET ?? "";
  if (!apiKey || !apiSecret) return NextResponse.json([]);

  try {
    const airports = await searchAirports({ apiKey, apiSecret, keyword });
    return NextResponse.json(airports);
  } catch {
    return NextResponse.json([]);
  }
}
