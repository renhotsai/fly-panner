import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SearchParams } from "@/lib/types";

interface SubscribeBody {
  email: string;
  params: SearchParams;
}

export async function POST(req: NextRequest) {
  let body: SubscribeBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, params } = body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }
  if (!params?.origin || !params?.destination) {
    return NextResponse.json({ error: "Search params required" }, { status: 400 });
  }

  const sub = await prisma.subscription.create({
    data: {
      email,
      origin: params.origin,
      destination: params.destination,
      departFrom: params.departFrom,
      departTo: params.departTo,
      returnFrom: params.returnFrom ?? "",
      returnTo: params.returnTo ?? "",
      adults: params.adults ?? 1,
      currency: params.currency ?? "USD",
      nonStop: params.nonStop ?? false,
      topN: Math.min(params.topN ?? 5, 10),
    },
  });

  return NextResponse.json({ ok: true, id: sub.id });
}
