"use client";

import { useState } from "react";
import SearchForm from "@/components/SearchForm";
import ResultsTable from "@/components/ResultsTable";
import type { FlightOffer, SearchParams } from "@/lib/types";

interface SearchState {
  offers: FlightOffer[];
  combinations: number;
  error: string | null;
}

export default function HomePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchState | null>(null);

  async function handleSearch(params: SearchParams) {
    setLoading(true);
    setResult(null);
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

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      {/* Header */}
      <header className="mb-8 text-center">
        <div className="mb-2 inline-flex items-center gap-2 text-4xl">
          <span>✈️</span>
          <h1 className="font-extrabold tracking-tight text-slate-800">
            fly-panner
          </h1>
        </div>
        <p className="text-slate-500">
          Find the cheapest flights within a flexible departure and return date
          range.
        </p>
      </header>

      {/* Search form */}
      <div className="mb-8">
        <SearchForm onSearch={handleSearch} loading={loading} />
      </div>

      {/* Error */}
      {result?.error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <strong>Error:</strong> {result.error}
        </div>
      )}

      {/* Results */}
      {result && !result.error && (
        <ResultsTable offers={result.offers} combinations={result.combinations} />
      )}

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-slate-400">
        Open-source · Powered by{" "}
        <a
          href="https://developers.amadeus.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-sky-500"
        >
          Amadeus
        </a>{" "}
        ·{" "}
        <a
          href="https://github.com/renhotsai/fly-panner"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-sky-500"
        >
          GitHub
        </a>
      </footer>
    </div>
  );
}
