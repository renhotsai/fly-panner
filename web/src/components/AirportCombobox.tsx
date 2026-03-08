"use client";

import { useState, useEffect, useRef } from "react";
import type { AirportOption } from "@/lib/types";

interface Props {
  placeholder?: string;
  initialValue?: string;
  onChange: (iata: string) => void;
}

function useDebounce<T>(value: T, ms: number): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return d;
}

function titleCase(s: string) {
  return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AirportCombobox({
  placeholder = "JFK",
  initialValue = "",
  onChange,
}: Props) {
  // inputText: what the <input> displays
  const [inputText, setInputText] = useState(initialValue);
  // isLabel: true when inputText is a formatted label like "YYZ · Toronto"
  const [isLabel, setIsLabel] = useState(false);
  const [options, setOptions] = useState<AirportOption[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  // Only search when not showing a label
  const searchQuery = isLabel ? "" : inputText;
  const debouncedQuery = useDebounce(searchQuery, 280);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setOptions([]);
      setOpen(false);
      return;
    }

    // Auto-accept direct 3-letter IATA entry
    if (/^[A-Z]{3}$/.test(debouncedQuery)) {
      onChange(debouncedQuery);
    }

    let cancelled = false;
    setLoading(true);
    fetch(`/api/airports?keyword=${encodeURIComponent(debouncedQuery)}`)
      .then((r) => r.json())
      .then((data: AirportOption[]) => {
        if (cancelled) return;
        setOptions(data);
        setOpen(data.length > 0);
        setActiveIdx(-1);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [debouncedQuery]);

  function select(opt: AirportOption) {
    setInputText(`${opt.iataCode} · ${titleCase(opt.cityName)}`);
    setIsLabel(true);
    onChange(opt.iataCode);
    setOptions([]);
    setOpen(false);
    setActiveIdx(-1);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    // Force uppercase for short strings (likely IATA code entry)
    const v = raw.length <= 4 ? raw.toUpperCase() : raw;
    setInputText(v);
    setIsLabel(false);
    // If no longer a valid 3-letter code, clear parent value
    if (!/^[A-Z]{3}$/.test(v)) onChange("");
  }

  function handleFocus() {
    // When re-focusing a label, show just the IATA code so user can edit
    if (isLabel) {
      const code = inputText.slice(0, 3);
      setInputText(code);
      setIsLabel(false);
    }
    if (options.length > 0) setOpen(true);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, options.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      select(options[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const dropdownRef = useRef<HTMLUListElement>(null);

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx >= 0 && dropdownRef.current) {
      const el = dropdownRef.current.children[activeIdx] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIdx]);

  return (
    <div className="relative">
      <div
        className={`flex items-center overflow-hidden rounded-xl border bg-white shadow-sm transition ${
          open ? "border-sky-400 ring-2 ring-sky-100" : "border-slate-200"
        }`}
      >
        {/* Plane icon */}
        <svg
          className="ml-3 h-4 w-4 shrink-0 text-slate-400"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
        </svg>

        <input
          type="text"
          className="w-full bg-transparent px-3 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
          placeholder={placeholder}
          value={inputText}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
        />

        {loading && (
          <svg
            className="mr-3 h-3.5 w-3.5 shrink-0 animate-spin text-slate-300"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12" cy="12" r="10"
              stroke="currentColor" strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            />
          </svg>
        )}
      </div>

      {/* Dropdown */}
      {open && options.length > 0 && (
        <ul
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl"
        >
          {options.map((opt, i) => (
            <li
              key={opt.iataCode}
              onMouseDown={() => select(opt)}
              className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition ${
                i === activeIdx ? "bg-sky-50" : "hover:bg-slate-50"
              } ${i > 0 ? "border-t border-slate-50" : ""}`}
            >
              <span className="w-10 shrink-0 font-bold text-slate-800">
                {opt.iataCode}
              </span>
              <span className="min-w-0 flex-1 truncate text-slate-600">
                {titleCase(opt.name)}
              </span>
              <span className="shrink-0 text-xs text-slate-400">
                {titleCase(opt.cityName)}, {opt.countryName}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
