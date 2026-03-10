import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { searchFlights } from "@/lib/serpapi";
import { dateRange } from "@/lib/dateRange";
import type { FlightOffer } from "@/lib/types";

const MAX_WORKERS = 4;

async function pool<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]> {
  const results: T[] = [];
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tasks.length) }, worker));
  return results;
}

function fmt(minutes: number) {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function buildEmail(offers: FlightOffer[], sub: {
  origin: string; destination: string;
  departFrom: string; departTo: string;
  returnFrom: string; returnTo: string;
  currency: string; token: string;
}): { subject: string; html: string } {
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const unsubUrl = `${base}/api/unsubscribe?token=${sub.token}`;
  const isRoundTrip = !!sub.returnFrom;
  const cheapest = offers[0];

  const subject = cheapest
    ? `✈️ ${sub.origin}→${sub.destination} 本週最低 ${cheapest.price.toLocaleString()} ${cheapest.currency}`
    : `✈️ ${sub.origin}→${sub.destination} 本週無航班資料`;

  const rows = offers
    .slice(0, 8)
    .map((o, i) => {
      const stops = o.outbound.stops === 0
        ? '<span style="color:#059669">直達</span>'
        : `<span style="color:#d97706">${o.outbound.stops} 停</span>`;
      const returnInfo = isRoundTrip && o.returnDate
        ? `<br/><span style="color:#94a3b8;font-size:12px">回程 ${o.returnDate}${o.tripDurationDays ? `，共 ${o.tripDurationDays} 天` : ""}</span>`
        : "";
      return `
        <tr style="border-bottom:1px solid #f1f5f9">
          <td style="padding:10px 8px;color:#64748b;font-size:13px">#${i + 1}</td>
          <td style="padding:10px 8px;font-weight:700;color:#059669;font-size:16px">
            ${o.price.toLocaleString()} ${o.currency}
          </td>
          <td style="padding:10px 8px;font-size:13px;color:#334155">
            ${o.departureDate}${returnInfo}
          </td>
          <td style="padding:10px 8px;font-size:13px">${stops}</td>
          <td style="padding:10px 8px;font-size:13px;color:#64748b">
            ${fmt(o.outbound.totalDurationMinutes)}<br/>
            <span style="font-size:11px">${o.outbound.carriers.join(", ")}</span>
          </td>
        </tr>`;
    })
    .join("");

  const departRange = sub.departFrom === sub.departTo
    ? sub.departFrom
    : `${sub.departFrom} ～ ${sub.departTo}`;
  const returnRange = isRoundTrip
    ? (sub.returnFrom === sub.returnTo ? sub.returnFrom : `${sub.returnFrom} ～ ${sub.returnTo}`)
    : "";

  const html = `
<!DOCTYPE html>
<html lang="zh-TW">
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,sans-serif">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
    <div style="background:linear-gradient(135deg,#0284c7,#6366f1);padding:24px 32px">
      <p style="margin:0;font-size:13px;color:#bae6fd;letter-spacing:.05em">FLY-PANNER 週間價格通知</p>
      <h1 style="margin:4px 0 0;font-size:24px;color:#fff">${sub.origin} → ${sub.destination}</h1>
    </div>
    <div style="padding:16px 32px;background:#f0f9ff;border-bottom:1px solid #e0f2fe;font-size:13px;color:#0369a1">
      出發：${departRange}
      ${isRoundTrip ? `&nbsp;&nbsp;|&nbsp;&nbsp; 回程：${returnRange}` : "&nbsp;&nbsp;|&nbsp;&nbsp; 單程"}
    </div>
    <div style="padding:24px 32px">
      ${offers.length === 0 ? `
        <p style="text-align:center;color:#94a3b8;padding:32px 0">本週查無符合條件的航班，下週再試。</p>
      ` : `
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:2px solid #e2e8f0">
              <th style="padding:8px;text-align:left;font-size:11px;color:#94a3b8;text-transform:uppercase">#</th>
              <th style="padding:8px;text-align:left;font-size:11px;color:#94a3b8;text-transform:uppercase">價格</th>
              <th style="padding:8px;text-align:left;font-size:11px;color:#94a3b8;text-transform:uppercase">日期</th>
              <th style="padding:8px;text-align:left;font-size:11px;color:#94a3b8;text-transform:uppercase">停靠</th>
              <th style="padding:8px;text-align:left;font-size:11px;color:#94a3b8;text-transform:uppercase">飛行時間</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `}
      <div style="margin-top:24px;text-align:center">
        <a href="${base}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600">
          查看完整結果 →
        </a>
      </div>
    </div>
    <div style="padding:16px 32px;border-top:1px solid #f1f5f9;font-size:12px;color:#94a3b8;text-align:center">
      Powered by Google Flights &nbsp;·&nbsp;
      <a href="${unsubUrl}" style="color:#94a3b8">取消訂閱</a>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const querySecret = req.nextUrl.searchParams.get("secret");
  const bearerSecret = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const provided = bearerSecret ?? querySecret;
  if (!provided || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.SERPAPI_KEY ?? "";
  const resendKey = process.env.RESEND_API_KEY ?? "";
  const fromEmail = process.env.RESEND_FROM ?? "alerts@fly-panner.com";

  if (!apiKey || !resendKey) {
    return NextResponse.json({ error: "Missing credentials" }, { status: 500 });
  }

  const resend = new Resend(resendKey);
  const subs = await prisma.subscription.findMany({ where: { active: true } });

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      const isRoundTrip = !!sub.returnFrom;
      const datePairs: { dep: string; ret?: string }[] = [];

      for (const dep of dateRange(sub.departFrom, sub.departTo)) {
        if (!isRoundTrip) {
          datePairs.push({ dep });
        } else {
          for (const ret of dateRange(sub.returnFrom, sub.returnTo)) {
            if (ret >= dep) datePairs.push({ dep, ret });
          }
        }
      }

      const tasks = datePairs.slice(0, 20).map(({ dep, ret }) => async () => {
        try {
          return await searchFlights({
            apiKey,
            origin: sub.origin,
            destination: sub.destination,
            departureDate: dep,
            returnDate: ret ?? undefined,
            adults: sub.adults,
            currency: sub.currency,
            nonStop: sub.nonStop,
          });
        } catch {
          return [] as FlightOffer[];
        }
      });

      const nested = await pool(tasks, MAX_WORKERS);
      const offers = nested.flat().sort((a, b) => a.price - b.price).slice(0, sub.topN);

      const { subject, html } = buildEmail(offers, sub);
      await resend.emails.send({ from: fromEmail, to: sub.email, subject, html });
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { lastSentAt: new Date() },
      });
      sent++;
    } catch (err) {
      console.error(`Failed for subscription ${sub.id}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ ok: true, sent, failed, total: subs.length });
}
