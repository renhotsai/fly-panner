"use client";

import { useState, useMemo } from "react";
import type { SearchParams } from "@/lib/types";
import { rangeLength } from "@/lib/dateRange";
import AirportCombobox from "./AirportCombobox";

interface Props {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
}

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "SGD", "TWD"];
const today = new Date().toISOString().slice(0, 10);

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-400">
      {children}
    </span>
  );
}

export default function SearchForm({ onSearch, loading }: Props) {
  const [tripType, setTripType] = useState<"oneway" | "roundtrip">("roundtrip");
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  // swapKey forces AirportCombobox to remount (reset display) after swap
  const [swapKey, setSwapKey] = useState(0);
  const [departFrom, setDepartFrom] = useState(today);
  const [departTo, setDepartTo] = useState(today);
  const [returnFrom, setReturnFrom] = useState("");
  const [returnTo, setReturnTo] = useState("");
  const [adults, setAdults] = useState(1);
  const [currency, setCurrency] = useState("USD");
  const [topN, setTopN] = useState(10);
  const [error, setError] = useState("");

  const combinations = useMemo(() => {
    const depCount = rangeLength(departFrom, departTo || departFrom);
    if (tripType === "oneway") return depCount;
    if (!returnFrom) return depCount;
    const retCount = rangeLength(returnFrom, returnTo || returnFrom);
    return depCount * retCount;
  }, [tripType, departFrom, departTo, returnFrom, returnTo]);

  function swap() {
    setOrigin(destination);
    setDestination(origin);
    setSwapKey((k) => k + 1);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (origin.length !== 3) { setError("Please select a valid origin airport."); return; }
    if (destination.length !== 3) { setError("Please select a valid destination airport."); return; }
    if (origin === destination) { setError("Origin and destination must be different."); return; }
    setError("");
    onSearch({
      origin,
      destination,
      departFrom,
      departTo: departTo || departFrom,
      returnFrom: tripType === "roundtrip" ? returnFrom : "",
      returnTo: tripType === "roundtrip" ? returnTo || returnFrom : "",
      adults,
      currency,
      topN,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-100"
    >
      {/* Trip type tabs */}
      <div className="mb-6 flex gap-2">
        {(["oneway", "roundtrip"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setTripType(type)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tripType === type
                ? "bg-sky-500 text-white shadow-sm"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            {type === "oneway" ? "One-way" : "Round trip"}
          </button>
        ))}
      </div>

      {/* Airport + date row */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end">
        {/* From */}
        <div className="flex-1">
          <Label>From</Label>
          <AirportCombobox
            key={`from-${swapKey}`}
            placeholder="JFK"
            initialValue={origin}
            onChange={setOrigin}
          />
        </div>

        {/* Swap button */}
        <button
          type="button"
          onClick={swap}
          title="Swap airports"
          className="mx-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-sm transition hover:border-sky-300 hover:text-sky-500 md:mb-0.5"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M7 16V4m0 0L3 8m4-4l4 4" />
            <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
          </svg>
        </button>

        {/* To */}
        <div className="flex-1">
          <Label>To</Label>
          <AirportCombobox
            key={`to-${swapKey}`}
            placeholder="LHR"
            initialValue={destination}
            onChange={setDestination}
          />
        </div>

        {/* Departure range */}
        <div className="flex-1">
          <Label>Depart</Label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              value={departFrom}
              min={today}
              onChange={(e) => setDepartFrom(e.target.value)}
              required
            />
            <span className="shrink-0 text-slate-300">→</span>
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
              value={departTo}
              min={departFrom}
              onChange={(e) => setDepartTo(e.target.value)}
            />
          </div>
        </div>

        {/* Return range */}
        {tripType === "roundtrip" && (
          <div className="flex-1">
            <Label>Return</Label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                value={returnFrom}
                min={departFrom}
                onChange={(e) => setReturnFrom(e.target.value)}
                required
              />
              <span className="shrink-0 text-slate-300">→</span>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                value={returnTo}
                min={returnFrom || departFrom}
                onChange={(e) => setReturnTo(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Inline validation error */}
      {error && (
        <p className="mb-3 text-xs font-medium text-red-500">{error}</p>
      )}

      {/* Options row */}
      <div className="flex flex-wrap items-end gap-4">
        {/* Adults counter */}
        <div>
          <Label>Passengers</Label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <button
              type="button"
              onClick={() => setAdults((n) => Math.max(1, n - 1))}
              disabled={adults <= 1}
              className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            >
              −
            </button>
            <span className="w-5 text-center text-sm font-semibold text-slate-700">
              {adults}
            </span>
            <button
              type="button"
              onClick={() => setAdults((n) => Math.min(9, n + 1))}
              disabled={adults >= 9}
              className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            >
              +
            </button>
            <span className="ml-1 text-sm text-slate-400">
              adult{adults !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Currency */}
        <div>
          <Label>Currency</Label>
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-sky-400 focus:outline-none"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Top N */}
        <div>
          <Label>Show top</Label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <button
              type="button"
              onClick={() => setTopN((n) => Math.max(5, n - 5))}
              disabled={topN <= 5}
              className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            >
              −
            </button>
            <span className="w-6 text-center text-sm font-semibold text-slate-700">
              {topN}
            </span>
            <button
              type="button"
              onClick={() => setTopN((n) => Math.min(50, n + 5))}
              className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
            >
              +
            </button>
          </div>
        </div>

        {/* Combinations hint */}
        <p className="ml-auto self-end pb-2.5 text-xs text-slate-400">
          ~{combinations} date combination{combinations !== 1 ? "s" : ""}
        </p>

        {/* Search button */}
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 rounded-xl bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-sky-300 focus:ring-offset-1"
        >
          {loading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Searching…
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              Search
            </>
          )}
        </button>
      </div>
    </form>
  );
}
