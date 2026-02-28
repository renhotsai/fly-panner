"use client";

import { useState } from "react";
import type { SearchParams } from "@/lib/types";

interface Props {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
}

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "CHF", "SGD"];
const today = new Date().toISOString().slice(0, 10);

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 placeholder:text-slate-400";

export default function SearchForm({ onSearch, loading }: Props) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [departFrom, setDepartFrom] = useState(today);
  const [departTo, setDepartTo] = useState(today);
  const [roundTrip, setRoundTrip] = useState(false);
  const [returnFrom, setReturnFrom] = useState("");
  const [returnTo, setReturnTo] = useState("");
  const [adults, setAdults] = useState(1);
  const [currency, setCurrency] = useState("USD");
  const [topN, setTopN] = useState(10);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSearch({
      origin: origin.trim().toUpperCase(),
      destination: destination.trim().toUpperCase(),
      departFrom,
      departTo: departTo || departFrom,
      returnFrom: roundTrip ? returnFrom : "",
      returnTo: roundTrip ? returnTo || returnFrom : "",
      adults,
      currency,
      topN,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md"
    >
      <h2 className="mb-5 text-lg font-bold text-slate-700">Search Flights</h2>

      {/* Airports */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Field label="From (IATA)">
          <input
            className={inputCls}
            placeholder="e.g. JFK"
            value={origin}
            maxLength={3}
            onChange={(e) => setOrigin(e.target.value.toUpperCase())}
            required
          />
        </Field>
        <Field label="To (IATA)">
          <input
            className={inputCls}
            placeholder="e.g. LHR"
            value={destination}
            maxLength={3}
            onChange={(e) => setDestination(e.target.value.toUpperCase())}
            required
          />
        </Field>
      </div>

      {/* Departure range */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Field label="Depart from">
          <input
            type="date"
            className={inputCls}
            value={departFrom}
            min={today}
            onChange={(e) => setDepartFrom(e.target.value)}
            required
          />
        </Field>
        <Field label="Depart to">
          <input
            type="date"
            className={inputCls}
            value={departTo}
            min={departFrom}
            onChange={(e) => setDepartTo(e.target.value)}
          />
        </Field>
      </div>

      {/* Round trip toggle */}
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          role="switch"
          aria-checked={roundTrip}
          onClick={() => setRoundTrip((v) => !v)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-1 ${
            roundTrip ? "bg-sky-500" : "bg-slate-200"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              roundTrip ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span className="text-sm font-medium text-slate-700">Round trip</span>
      </div>

      {/* Return range */}
      {roundTrip && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Return from">
            <input
              type="date"
              className={inputCls}
              value={returnFrom}
              min={departFrom}
              onChange={(e) => setReturnFrom(e.target.value)}
              required={roundTrip}
            />
          </Field>
          <Field label="Return to">
            <input
              type="date"
              className={inputCls}
              value={returnTo}
              min={returnFrom || departFrom}
              onChange={(e) => setReturnTo(e.target.value)}
            />
          </Field>
        </div>
      )}

      {/* Options row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Field label="Adults">
          <input
            type="number"
            className={inputCls}
            value={adults}
            min={1}
            max={9}
            onChange={(e) => setAdults(Number(e.target.value))}
          />
        </Field>
        <Field label="Currency">
          <select
            className={inputCls}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Show top">
          <input
            type="number"
            className={inputCls}
            value={topN}
            min={1}
            max={50}
            onChange={(e) => setTopN(Number(e.target.value))}
          />
        </Field>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-offset-1"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            Searching…
          </span>
        ) : (
          "Search Flights"
        )}
      </button>
    </form>
  );
}
