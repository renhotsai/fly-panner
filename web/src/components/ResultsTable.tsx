"use client";

import { useState } from "react";
import type { FlightItinerary, FlightOffer } from "@/lib/types";

interface Props {
  offers: FlightOffer[];
  combinations: number;
}

type SortKey = "price" | "departure" | "duration" | "stops";

function fmt(minutes: number) {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function fmtTime(iso: string) {
  return iso.slice(11, 16); // "HH:MM"
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

function downloadCsv(offers: FlightOffer[]) {
  const header = [
    "rank","price","currency","departure_date","return_date",
    "trip_duration_days","origin","destination","outbound_duration_min",
    "outbound_stops","outbound_carriers","inbound_duration_min",
    "inbound_stops","inbound_carriers",
  ].join(",");
  const rows = offers.map((o, i) =>
    [
      i + 1, o.price, o.currency, o.departureDate, o.returnDate ?? "",
      o.tripDurationDays ?? "", o.outbound.origin, o.outbound.destination,
      o.outbound.totalDurationMinutes, o.outbound.stops,
      o.outbound.carriers.join("|"), o.inbound?.totalDurationMinutes ?? "",
      o.inbound?.stops ?? "", o.inbound?.carriers.join("|") ?? "",
    ].join(",")
  );
  const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(blob),
    download: "fly-panner-results.csv",
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

// ── Google Flights booking URL ────────────────────────────────────────
function buildGoogleFlightsUrl(offer: FlightOffer): string {
  const { origin, destination } = offer.outbound;
  const dep = offer.departureDate;
  if (offer.returnDate) {
    return `https://www.google.com/travel/flights?hl=en&q=flights+from+${origin}+to+${destination}+${dep}+return+${offer.returnDate}`;
  }
  return `https://www.google.com/travel/flights?hl=en&q=flights+from+${origin}+to+${destination}+${dep}`;
}

// ── Route visualizer ──────────────────────────────────────────────────
function RouteVisualizer({ it }: { it: FlightItinerary }) {
  const depTime = fmtTime(it.segments[0].departureTime);
  const arrTime = fmtTime(it.segments[it.segments.length - 1].arrivalTime);

  // Layover airports: arrival airports of all segments except the last
  const layoverAirports = it.segments.slice(0, -1).map((seg, idx) => ({
    iata: seg.arrivalAirport,
    arrTime: fmtTime(seg.arrivalTime),
    depTime: fmtTime(it.segments[idx + 1].departureTime),
    layoverMinutes:
      (new Date(it.segments[idx + 1].departureTime).getTime() -
        new Date(seg.arrivalTime).getTime()) / 60_000,
  }));

  return (
    <div className="flex items-center gap-3">
      {/* Origin */}
      <div className="w-16 shrink-0 text-right">
        <div className="text-xl font-bold text-slate-800">{it.origin}</div>
        <div className="text-sm tabular-nums text-slate-500">{depTime}</div>
      </div>

      {/* Line with layover stops */}
      <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
        <span className="text-[11px] text-slate-400">{fmt(it.totalDurationMinutes)}</span>
        <div className="flex w-full items-center gap-1">
          <div className="h-px flex-1 bg-slate-200" />
          {layoverAirports.map((stop, i) => (
            <div key={i} className="group relative flex flex-col items-center">
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
              {/* Tooltip with layover details */}
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-2.5 py-1.5 text-center text-[11px] text-white shadow-lg group-hover:block">
                <div className="font-bold">{stop.iata}</div>
                <div className="text-slate-300">{stop.arrTime} → {stop.depTime}</div>
                {stop.layoverMinutes > 0 && (
                  <div className="text-amber-300">{fmt(Math.round(stop.layoverMinutes))} layover</div>
                )}
              </div>
            </div>
          ))}
          <div className="h-px flex-1 bg-slate-200" />
        </div>
        <span className="text-[11px] text-slate-400">
          {it.stops === 0 ? (
            <span className="font-medium text-emerald-600">Direct</span>
          ) : (
            <span className="font-medium text-amber-600">
              via {layoverAirports.map((s) => s.iata).join(", ")}
            </span>
          )}
          {" · "}
          {it.carriers.join(", ")}
        </span>
      </div>

      {/* Destination */}
      <div className="w-16 shrink-0 text-left">
        <div className="text-xl font-bold text-slate-800">{it.destination}</div>
        <div className="text-sm tabular-nums text-slate-500">{arrTime}</div>
      </div>
    </div>
  );
}

// ── Flight card ───────────────────────────────────────────────────────
function FlightCard({ offer, rank }: { offer: FlightOffer; rank: number }) {
  const isBest = rank === 1;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
        isBest ? "border-sky-200 ring-1 ring-sky-200" : "border-slate-200"
      }`}
    >
      {/* Best deal ribbon */}
      {isBest && (
        <div className="absolute right-0 top-0 rounded-bl-xl bg-sky-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
          Best deal
        </div>
      )}

      <div className="flex flex-col gap-0 md:flex-row">
        {/* Left – itinerary */}
        <div className="flex-1 p-5">
          {/* Outbound */}
          <div className="mb-1">
            <span className="mb-2 inline-block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              {offer.inbound ? "Outbound · " : ""}
              {fmtDate(offer.outbound.departureDate)}
            </span>
          </div>
          <RouteVisualizer it={offer.outbound} />

          {/* Inbound */}
          {offer.inbound && (
            <>
              <div className="my-4 flex items-center gap-2">
                <div className="h-px flex-1 border-t border-dashed border-slate-200" />
                <span className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
                  Return
                </span>
                <div className="h-px flex-1 border-t border-dashed border-slate-200" />
              </div>
              <div className="mb-1">
                <span className="mb-2 inline-block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  {fmtDate(offer.inbound.departureDate)}
                </span>
              </div>
              <RouteVisualizer it={offer.inbound} />
            </>
          )}
        </div>

        {/* Right – price */}
        <div className="flex shrink-0 flex-col items-end justify-center border-t border-slate-100 px-5 py-5 md:w-44 md:border-l md:border-t-0">
          <div className="text-3xl font-extrabold text-emerald-600">
            {offer.price.toLocaleString("en-US", {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </div>
          <div className="mb-3 text-sm text-slate-400">{offer.currency} / person</div>

          {offer.tripDurationDays != null && (
            <div className="text-xs text-slate-400">
              {offer.tripDurationDays}-day trip
            </div>
          )}
          {offer.seatsRemaining != null && offer.seatsRemaining <= 5 && (
            <div className="mt-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-600">
              {offer.seatsRemaining} seat{offer.seatsRemaining !== 1 ? "s" : ""} left
            </div>
          )}

          <a
            href={buildGoogleFlightsUrl(offer)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block w-full rounded-xl bg-sky-500 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-sky-600"
          >
            Book →
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton card ─────────────────────────────────────────────────────
export function SkeletonCards() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          style={{ animationDelay: `${i * 120}ms` }}
        >
          <div className="mb-4 h-3 w-28 rounded bg-slate-100" />
          <div className="flex items-center gap-4">
            <div className="h-8 w-12 rounded-lg bg-slate-100" />
            <div className="flex-1">
              <div className="h-px bg-slate-100" />
            </div>
            <div className="h-8 w-12 rounded-lg bg-slate-100" />
            <div className="ml-auto h-8 w-20 rounded-lg bg-emerald-50" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────
const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "price", label: "Price" },
  { key: "departure", label: "Departure" },
  { key: "duration", label: "Duration" },
  { key: "stops", label: "Stops" },
];

export default function ResultsTable({ offers, combinations }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("price");
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = [...offers].sort((a, b) => {
    let diff = 0;
    if (sortKey === "price") diff = a.price - b.price;
    else if (sortKey === "departure") diff = a.departureDate.localeCompare(b.departureDate);
    else if (sortKey === "duration") diff = a.outbound.totalDurationMinutes - b.outbound.totalDurationMinutes;
    else if (sortKey === "stops") diff = a.outbound.stops - b.outbound.stops;
    return sortAsc ? diff : -diff;
  });

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortAsc((v) => !v);
    else { setSortKey(key); setSortAsc(true); }
  }

  if (offers.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
        <div className="mb-3 text-4xl">🔍</div>
        <p className="font-semibold text-slate-600">No flights found</p>
        <p className="mt-1 text-sm text-slate-400">
          Try broadening your date range or checking the airport codes.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Stats + controls */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          <span className="font-semibold text-slate-700">{offers.length}</span>{" "}
          offer{offers.length !== 1 ? "s" : ""} from{" "}
          <span className="font-semibold text-slate-700">{combinations}</span>{" "}
          date combination{combinations !== 1 ? "s" : ""}
        </p>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Sort:</span>
          {SORT_OPTIONS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                sortKey === key
                  ? "bg-sky-500 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {label} {sortKey === key ? (sortAsc ? "↑" : "↓") : ""}
            </button>
          ))}

          <button
            onClick={() => downloadCsv(offers)}
            className="ml-2 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-50"
          >
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            CSV
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="flex flex-col gap-3">
        {sorted.map((offer, idx) => (
          <FlightCard key={idx} offer={offer} rank={idx + 1} />
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Prices per person · All taxes included · Powered by Google Flights
      </p>
    </div>
  );
}
