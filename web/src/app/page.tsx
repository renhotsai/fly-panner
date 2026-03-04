"use client";

import { useState } from "react";
import SearchForm from "@/components/SearchForm";
import ResultsTable, { SkeletonCards } from "@/components/ResultsTable";
import SubscribeForm from "@/components/SubscribeForm";
import type { FlightOffer, SearchParams } from "@/lib/types";

interface SearchState {
  offers: FlightOffer[];
  combinations: number;
  error: string | null;
}

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchState | null>(null);
  const [lastParams, setLastParams] = useState<SearchParams | null>(null);

  async function handleSearch(params: SearchParams) {
    setLoading(true);
    setResult(null);
    setLastParams(params);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ offers: [], combinations: 0, error: data.error ?? "Unknown error" });
      } else {
        setResult({ offers: data.offers, combinations: data.combinations, error: null });
      }
    } catch (err) {
      setResult({
        offers: [],
        combinations: 0,
        error: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setLoading(false);
    }
  }

  const hasResults = result && !result.error;

  return (
    <div className="min-h-screen">
      {/* Hero / header band */}
      <div className="bg-gradient-to-br from-sky-600 via-sky-500 to-indigo-500 px-4 pb-16 pt-12">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-2 flex items-center justify-center gap-3">
            <span className="text-3xl">✈️</span>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              fly-panner
            </h1>
          </div>
          <p className="text-sky-100">
            Find the cheapest flights across a flexible range of dates.
          </p>
        </div>
      </div>

      {/* Search card – overlaps the hero */}
      <div className="mx-auto -mt-6 max-w-4xl px-4">
        <SearchForm onSearch={handleSearch} loading={loading} />
      </div>

      {/* Results area */}
      <div className="mx-auto max-w-4xl px-4 pb-16 pt-8">
        {/* Error */}
        {result?.error && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
            </svg>
            <div>
              <strong>Error: </strong>
              {result.error}
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && <SkeletonCards />}

        {/* Results + subscribe */}
        {!loading && hasResults && (
          <>
            <ResultsTable offers={result.offers} combinations={result.combinations} />
            {lastParams && <SubscribeForm searchParams={lastParams} />}
          </>
        )}

        {/* Empty landing state */}
        {!loading && !result && (
          <div className="py-16 text-center">
            <p className="text-sm text-slate-400">
              Enter your route and date range above to find the cheapest fares.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-6 text-center text-xs text-slate-400">
        Open-source ·{" "}
        <a href="https://serpapi.com/google-flights-api" target="_blank" rel="noopener noreferrer" className="hover:text-sky-500 underline">
          Google Flights
        </a>
        {" · "}
        <a href="https://github.com/renhotsai/fly-panner" target="_blank" rel="noopener noreferrer" className="hover:text-sky-500 underline">
          GitHub
        </a>
      </footer>
    </div>
  );
}
