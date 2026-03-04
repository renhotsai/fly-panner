import { NextRequest, NextResponse } from "next/server";
import { searchAirports } from "@/lib/airports-data";

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("keyword")?.trim() ?? "";
  if (keyword.length < 2) return NextResponse.json([]);
  return NextResponse.json(searchAirports(keyword));
}
