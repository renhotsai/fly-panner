import { NextRequest, NextResponse } from "next/server";
import { searchAirports } from "@/lib/tequila";

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword")?.trim() ?? "";
  if (keyword.length < 2) return NextResponse.json([]);

  const apiKey = process.env.TEQUILA_API_KEY ?? "";
  if (!apiKey) return NextResponse.json([]);

  try {
    const airports = await searchAirports({ apiKey, keyword });
    return NextResponse.json(airports);
  } catch {
    return NextResponse.json([]);
  }
}
