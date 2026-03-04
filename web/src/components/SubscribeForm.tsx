"use client";

import { useState } from "react";
import type { SearchParams } from "@/lib/types";

interface Props {
  searchParams: SearchParams;
}

export default function SubscribeForm({ searchParams }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, params: searchParams }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "訂閱失敗，請再試一次。");
      } else {
        setStatus("success");
        setMessage("訂閱成功！每週一早上會收到最新價格。");
        setEmail("");
      }
    } catch {
      setStatus("error");
      setMessage("網路錯誤，請再試一次。");
    }
  }

  const route = `${searchParams.origin} → ${searchParams.destination}`;

  return (
    <div className="mt-6 rounded-2xl border border-sky-100 bg-sky-50 px-5 py-4">
      <div className="mb-3 flex items-center gap-2">
        <svg className="h-4 w-4 text-sky-500" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2a6 6 0 0 0-6 6v3.586l-.707.707A1 1 0 0 0 4 14h12a1 1 0 0 0 .707-1.707L16 11.586V8a6 6 0 0 0-6-6zm0 16a2 2 0 0 1-2-2h4a2 2 0 0 1-2 2z" />
        </svg>
        <span className="text-sm font-semibold text-sky-800">
          每週收到 {route} 的最低價通知
        </span>
      </div>

      {status === "success" ? (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5z" clipRule="evenodd" />
          </svg>
          {message}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
          <input
            type="email"
            required
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 rounded-xl border border-sky-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:opacity-50"
          >
            {status === "loading" ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                訂閱中…
              </>
            ) : "訂閱"}
          </button>
        </form>
      )}

      {status === "error" && (
        <p className="mt-2 text-xs text-red-500">{message}</p>
      )}

      <p className="mt-2 text-xs text-sky-600/70">
        每週一發送 · 可隨時透過 email 連結取消
      </p>
    </div>
  );
}
