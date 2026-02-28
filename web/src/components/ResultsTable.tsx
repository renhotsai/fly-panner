"use client";

import { useState } from "react";
import type { FlightOffer } from "@/lib/types";

interface Props {
  offers: FlightOffer[];
  combinations: number;
}

type SortKey = "price" | "departure" | "duration" | "stops";

function formatDuration(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function downloadCsv(offers: FlightOffer[]) {
  const header = [
    "rank",
    "price",
    "currency",
    "departure_date",
    "return_date",
    "trip_duration_days",
    "origin",
    "destination",
    "outbound_duration_min",
    "outbound_stops",
    "outbound_carriers",
    "inbound_duration_min",
    "inbound_stops",
    "inbound_carriers",
  ].join(",");

  const rows = offers.map((o, i) =>
    [
      i + 1,
      o.price,
      o.currency,
      o.departureDate,
      o.returnDate ?? "",
      o.tripDurationDays ?? "",
      o.outbound.origin,
      o.outbound.destination,
      o.outbound.totalDurationMinutes,
      o.outbound.stops,
      o.outbound.carriers.join("|"),
      o.inbound?.totalDurationMinutes ?? "",
      o.inbound?.stops ?? "",
      o.inbound?.carriers.join("|") ?? "",
    ].join(",")
  );

  const blob = new Blob([[header, ...rows].join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fly-panner-results.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ResultsTable({ offers, combinations }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("price");
  const [sortAsc, setSortAsc] = useState(true);

  const isRoundTrip = offers.some((o) => o.inbound !== null);

  const sorted = [...offers].sort((a, b) => {
    let diff = 0;
    if (sortKey === "price") diff = a.price - b.price;
    else if (sortKey === "departure") diff = a.departureDate.localeCompare(b.departureDate);
    else if (sortKey === "duration") diff = a.outbound.totalDurationMinutes - b.outbound.totalDurationMinutes;
    else if (sortKey === "stops") diff = a.outbound.stops - b.outbound.stops;
    return sortAsc ? diff : -diff;
  });

  function handleSort(key: SortKey) {
    if (key === sortKey) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function SortHeader({
    label,
    col,
  }: {
    label: string;
    col: SortKey;
  }) {
    const active = sortKey === col;
    return (
      <th
        className="cursor-pointer select-none px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 hover:text-sky-600"
        onClick={() => handleSort(col)}
      >
        <span className="flex items-center gap-1">
          {label}
          <span className="text-slate-300">
            {active ? (sortAsc ? "↑" : "↓") : "↕"}
          </span>
        </span>
      </th>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
        No flights found. Try broadening your date range or checking the airport codes.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-md overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <span className="font-semibold text-slate-700">
            {offers.length} offer{offers.length !== 1 ? "s" : ""}
          </span>
          <span className="ml-2 text-sm text-slate-400">
            from {combinations} date combination{combinations !== 1 ? "s" : ""}
          </span>
        </div>
        <button
          onClick={() => downloadCsv(offers)}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                #
              </th>
              <SortHeader label="Price" col="price" />
              <SortHeader label="Depart" col="departure" />
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Route
              </th>
              <SortHeader label="Duration" col="duration" />
              <SortHeader label="Stops" col="stops" />
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Carrier(s)
              </th>
              {isRoundTrip && (
                <>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Return
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Trip
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((offer, idx) => (
              <tr key={idx} className="hover:bg-sky-50 transition-colors">
                <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                <td className="px-4 py-3 font-semibold text-emerald-600 whitespace-nowrap">
                  {offer.price.toLocaleString(undefined, {
                    style: "currency",
                    currency: offer.currency,
                    minimumFractionDigits: 2,
                  })}
                </td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                  {offer.departureDate}
                </td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap font-medium">
                  {offer.outbound.origin} → {offer.outbound.destination}
                </td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                  {formatDuration(offer.outbound.totalDurationMinutes)}
                </td>
                <td className="px-4 py-3">
                  {offer.outbound.stops === 0 ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Direct
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {offer.outbound.stops} stop{offer.outbound.stops > 1 ? "s" : ""}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {offer.outbound.carriers.join(", ")}
                </td>
                {isRoundTrip && (
                  <>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                      {offer.returnDate ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                      {offer.tripDurationDays != null
                        ? `${offer.tripDurationDays}d`
                        : "—"}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="px-5 py-3 text-xs text-slate-400 border-t border-slate-100">
        Prices per person · All taxes included · Powered by Amadeus
      </p>
    </div>
  );
}
