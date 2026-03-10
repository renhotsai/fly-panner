"use client";

import { useState, useMemo, useRef } from "react";
import type { SearchParams } from "@/lib/types";
import { rangeLength } from "@/lib/dateRange";
import AirportCombobox from "./AirportCombobox";
import { AIRPORTS } from "@/lib/airports-data";

// Deduplicated list of countries from airport data
const ALL_COUNTRIES: { code: string; name: string }[] = Array.from(
  new Map(AIRPORTS.map((a) => [a.countryCode, { code: a.countryCode, name: a.countryName }])).values()
).sort((a, b) => a.name.localeCompare(b.name));

interface Props {
  onSearch: (params: SearchParams) => void;
  loading: boolean;
}

// ISO 4217 active currencies, sorted by code
const CURRENCIES: { code: string; name: string }[] = [
  { code: "AED", name: "UAE Dirham" },
  { code: "AFN", name: "Afghan Afghani" },
  { code: "ALL", name: "Albanian Lek" },
  { code: "AMD", name: "Armenian Dram" },
  { code: "ANG", name: "Netherlands Antillean Guilder" },
  { code: "AOA", name: "Angolan Kwanza" },
  { code: "ARS", name: "Argentine Peso" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "AWG", name: "Aruban Florin" },
  { code: "AZN", name: "Azerbaijani Manat" },
  { code: "BAM", name: "Bosnia-Herzegovina Convertible Mark" },
  { code: "BBD", name: "Barbadian Dollar" },
  { code: "BDT", name: "Bangladeshi Taka" },
  { code: "BGN", name: "Bulgarian Lev" },
  { code: "BHD", name: "Bahraini Dinar" },
  { code: "BIF", name: "Burundian Franc" },
  { code: "BMD", name: "Bermudian Dollar" },
  { code: "BND", name: "Brunei Dollar" },
  { code: "BOB", name: "Bolivian Boliviano" },
  { code: "BRL", name: "Brazilian Real" },
  { code: "BSD", name: "Bahamian Dollar" },
  { code: "BTN", name: "Bhutanese Ngultrum" },
  { code: "BWP", name: "Botswanan Pula" },
  { code: "BYN", name: "Belarusian Ruble" },
  { code: "BZD", name: "Belize Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "CDF", name: "Congolese Franc" },
  { code: "CHF", name: "Swiss Franc" },
  { code: "CLP", name: "Chilean Peso" },
  { code: "CNY", name: "Chinese Yuan" },
  { code: "COP", name: "Colombian Peso" },
  { code: "CRC", name: "Costa Rican Colón" },
  { code: "CUP", name: "Cuban Peso" },
  { code: "CVE", name: "Cape Verdean Escudo" },
  { code: "CZK", name: "Czech Koruna" },
  { code: "DJF", name: "Djiboutian Franc" },
  { code: "DKK", name: "Danish Krone" },
  { code: "DOP", name: "Dominican Peso" },
  { code: "DZD", name: "Algerian Dinar" },
  { code: "EGP", name: "Egyptian Pound" },
  { code: "ERN", name: "Eritrean Nakfa" },
  { code: "ETB", name: "Ethiopian Birr" },
  { code: "EUR", name: "Euro" },
  { code: "FJD", name: "Fijian Dollar" },
  { code: "FKP", name: "Falkland Islands Pound" },
  { code: "GBP", name: "British Pound Sterling" },
  { code: "GEL", name: "Georgian Lari" },
  { code: "GHS", name: "Ghanaian Cedi" },
  { code: "GIP", name: "Gibraltar Pound" },
  { code: "GMD", name: "Gambian Dalasi" },
  { code: "GNF", name: "Guinean Franc" },
  { code: "GTQ", name: "Guatemalan Quetzal" },
  { code: "GYD", name: "Guyanaese Dollar" },
  { code: "HKD", name: "Hong Kong Dollar" },
  { code: "HNL", name: "Honduran Lempira" },
  { code: "HTG", name: "Haitian Gourde" },
  { code: "HUF", name: "Hungarian Forint" },
  { code: "IDR", name: "Indonesian Rupiah" },
  { code: "ILS", name: "Israeli New Shekel" },
  { code: "INR", name: "Indian Rupee" },
  { code: "IQD", name: "Iraqi Dinar" },
  { code: "IRR", name: "Iranian Rial" },
  { code: "ISK", name: "Icelandic Króna" },
  { code: "JMD", name: "Jamaican Dollar" },
  { code: "JOD", name: "Jordanian Dinar" },
  { code: "JPY", name: "Japanese Yen" },
  { code: "KES", name: "Kenyan Shilling" },
  { code: "KGS", name: "Kyrgystani Som" },
  { code: "KHR", name: "Cambodian Riel" },
  { code: "KMF", name: "Comorian Franc" },
  { code: "KRW", name: "South Korean Won" },
  { code: "KWD", name: "Kuwaiti Dinar" },
  { code: "KYD", name: "Cayman Islands Dollar" },
  { code: "KZT", name: "Kazakhstani Tenge" },
  { code: "LAK", name: "Laotian Kip" },
  { code: "LBP", name: "Lebanese Pound" },
  { code: "LKR", name: "Sri Lankan Rupee" },
  { code: "LRD", name: "Liberian Dollar" },
  { code: "LSL", name: "Lesotho Loti" },
  { code: "LYD", name: "Libyan Dinar" },
  { code: "MAD", name: "Moroccan Dirham" },
  { code: "MDL", name: "Moldovan Leu" },
  { code: "MGA", name: "Malagasy Ariary" },
  { code: "MKD", name: "Macedonian Denar" },
  { code: "MMK", name: "Myanmar Kyat" },
  { code: "MNT", name: "Mongolian Tögrög" },
  { code: "MOP", name: "Macanese Pataca" },
  { code: "MRU", name: "Mauritanian Ouguiya" },
  { code: "MUR", name: "Mauritian Rupee" },
  { code: "MVR", name: "Maldivian Rufiyaa" },
  { code: "MWK", name: "Malawian Kwacha" },
  { code: "MXN", name: "Mexican Peso" },
  { code: "MYR", name: "Malaysian Ringgit" },
  { code: "MZN", name: "Mozambican Metical" },
  { code: "NAD", name: "Namibian Dollar" },
  { code: "NGN", name: "Nigerian Naira" },
  { code: "NIO", name: "Nicaraguan Córdoba" },
  { code: "NOK", name: "Norwegian Krone" },
  { code: "NPR", name: "Nepalese Rupee" },
  { code: "NZD", name: "New Zealand Dollar" },
  { code: "OMR", name: "Omani Rial" },
  { code: "PAB", name: "Panamanian Balboa" },
  { code: "PEN", name: "Peruvian Sol" },
  { code: "PGK", name: "Papua New Guinean Kina" },
  { code: "PHP", name: "Philippine Peso" },
  { code: "PKR", name: "Pakistani Rupee" },
  { code: "PLN", name: "Polish Zloty" },
  { code: "PYG", name: "Paraguayan Guaraní" },
  { code: "QAR", name: "Qatari Rial" },
  { code: "RON", name: "Romanian Leu" },
  { code: "RSD", name: "Serbian Dinar" },
  { code: "RUB", name: "Russian Ruble" },
  { code: "RWF", name: "Rwandan Franc" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "SBD", name: "Solomon Islands Dollar" },
  { code: "SCR", name: "Seychellois Rupee" },
  { code: "SDG", name: "Sudanese Pound" },
  { code: "SEK", name: "Swedish Krona" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "SHP", name: "Saint Helena Pound" },
  { code: "SLE", name: "Sierra Leonean Leone" },
  { code: "SOS", name: "Somali Shilling" },
  { code: "SRD", name: "Surinamese Dollar" },
  { code: "STN", name: "São Tomé & Príncipe Dobra" },
  { code: "SVC", name: "Salvadoran Colón" },
  { code: "SYP", name: "Syrian Pound" },
  { code: "SZL", name: "Swazi Lilangeni" },
  { code: "THB", name: "Thai Baht" },
  { code: "TJS", name: "Tajikistani Somoni" },
  { code: "TMT", name: "Turkmenistani Manat" },
  { code: "TND", name: "Tunisian Dinar" },
  { code: "TOP", name: "Tongan Paʻanga" },
  { code: "TRY", name: "Turkish Lira" },
  { code: "TTD", name: "Trinidad & Tobago Dollar" },
  { code: "TWD", name: "New Taiwan Dollar" },
  { code: "TZS", name: "Tanzanian Shilling" },
  { code: "UAH", name: "Ukrainian Hryvnia" },
  { code: "UGX", name: "Ugandan Shilling" },
  { code: "USD", name: "US Dollar" },
  { code: "UYU", name: "Uruguayan Peso" },
  { code: "UZS", name: "Uzbekistani Som" },
  { code: "VES", name: "Venezuelan Bolívar" },
  { code: "VND", name: "Vietnamese Dong" },
  { code: "VUV", name: "Vanuatu Vatu" },
  { code: "WST", name: "Samoan Tala" },
  { code: "XAF", name: "Central African CFA Franc" },
  { code: "XCD", name: "East Caribbean Dollar" },
  { code: "XOF", name: "West African CFA Franc" },
  { code: "XPF", name: "CFP Franc" },
  { code: "YER", name: "Yemeni Rial" },
  { code: "ZAR", name: "South African Rand" },
  { code: "ZMW", name: "Zambian Kwacha" },
  { code: "ZWL", name: "Zimbabwean Dollar" },
];
const today = new Date().toISOString().slice(0, 10);

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

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
  const [bags, setBags] = useState(0);
  const [currency, setCurrency] = useState("USD");
  const [topN, setTopN] = useState(10);
  const [nonStop, setNonStop] = useState(false);
  const [error, setError] = useState("");
  const [excludeCountryInput, setExcludeCountryInput] = useState("");
  const [excludeLayoverCountries, setExcludeLayoverCountries] = useState<string[]>([]);
  const [countryDropdownOpen, setCountryDropdownOpen] = useState(false);
  const [countryActiveIdx, setCountryActiveIdx] = useState(-1);
  const countryDropdownRef = useRef<HTMLUListElement>(null);
  const departFromRef = useRef<HTMLInputElement>(null);
  const departToRef = useRef<HTMLInputElement>(null);
  const returnFromRef = useRef<HTMLInputElement>(null);
  const returnToRef = useRef<HTMLInputElement>(null);

  const combinations = useMemo(() => {
    const depCount = rangeLength(departFrom, departTo || departFrom);
    if (tripType === "oneway") return depCount;
    if (!returnFrom) return depCount;
    const retCount = rangeLength(returnFrom, returnTo || returnFrom);
    return depCount * retCount;
  }, [tripType, departFrom, departTo, returnFrom, returnTo]);

  // Country suggestions filtered by current input
  const countrySuggestions = useMemo(() => {
    const q = excludeCountryInput.trim().toLowerCase();
    if (!q) return [];
    return ALL_COUNTRIES.filter(
      (c) =>
        !excludeLayoverCountries.includes(c.name) &&
        !excludeLayoverCountries.includes(c.code) &&
        (c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [excludeCountryInput, excludeLayoverCountries]);

  function addExcludeCountry(country: { code: string; name: string }) {
    if (!excludeLayoverCountries.includes(country.name)) {
      setExcludeLayoverCountries((prev) => [...prev, country.name]);
    }
    setExcludeCountryInput("");
    setCountryDropdownOpen(false);
    setCountryActiveIdx(-1);
  }

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
    if (tripType === "roundtrip" && returnFrom && returnFrom <= (departTo || departFrom)) {
      setError("Return date must be at least 1 day after the departure date.");
      return;
    }
    setError("");
    onSearch({
      origin,
      destination,
      departFrom,
      departTo: departTo || departFrom,
      returnFrom: tripType === "roundtrip" ? returnFrom : "",
      returnTo: tripType === "roundtrip" ? returnTo || returnFrom : "",
      adults,
      bags,
      currency,
      topN,
      nonStop,
      excludeLayoverCountries: excludeLayoverCountries.length > 0 ? excludeLayoverCountries : undefined,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-lg shadow-slate-100"
    >
      {/* Trip type tabs + direct-only toggle */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
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

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            role="switch"
            aria-checked={nonStop}
            onClick={() => setNonStop((v) => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
              nonStop ? "bg-sky-500" : "bg-slate-200"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                nonStop ? "translate-x-4" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-sm text-slate-500">Direct only</span>
        </div>
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
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white shadow-sm transition focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100">
            <input
              ref={departFromRef}
              type="date"
              className="flex-1 bg-transparent px-4 py-3 text-sm text-slate-800 focus:outline-none"
              value={departFrom}
              min={today}
              onChange={(e) => {
                const val = e.target.value;
                setDepartFrom(val);
                // Clamp departTo up to departFrom if it fell behind
                const newDepartTo = departTo < val ? val : departTo;
                setDepartTo(newDepartTo);
                // Push return dates forward if they now conflict with newDepartTo
                if (returnFrom && returnFrom <= newDepartTo) {
                  const next = addDays(newDepartTo, 1);
                  setReturnFrom(next);
                  if (returnTo && returnTo < next) setReturnTo(next);
                }
                departFromRef.current?.blur();
              }}
              required
            />
            <span className="shrink-0 text-slate-300">→</span>
            <input
              ref={departToRef}
              type="date"
              className="flex-1 bg-transparent px-4 py-3 text-sm text-slate-800 focus:outline-none"
              value={departTo}
              min={departFrom}
              onChange={(e) => {
                const val = e.target.value < departFrom ? departFrom : e.target.value;
                setDepartTo(val);
                // Keep returnFrom at least 1 day after the new departTo
                if (returnFrom && returnFrom <= val) {
                  const next = addDays(val, 1);
                  setReturnFrom(next);
                  if (returnTo && returnTo < next) setReturnTo(next);
                }
                departToRef.current?.blur();
              }}
            />
          </div>
        </div>

        {/* Return range */}
        {tripType === "roundtrip" && (
          <div className="flex-1">
            <Label>Return</Label>
            <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white shadow-sm transition focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100">
              <div className="group relative flex-1">
                <input
                  ref={returnFromRef}
                  type="date"
                  className={`w-full bg-transparent px-4 py-3 text-sm focus:outline-none group-focus-within:text-slate-800 ${returnFrom ? "text-slate-800" : "text-transparent"}`}
                  value={returnFrom}
                  min={addDays(departTo || departFrom, 1)}
                  onChange={(e) => {
                    const minReturn = addDays(departTo || departFrom, 1);
                    const val = e.target.value < minReturn ? minReturn : e.target.value;
                    setReturnFrom(val);
                    returnFromRef.current?.blur();
                  }}
                  required
                />
                {!returnFrom && (
                  <span className="pointer-events-none absolute inset-0 flex items-center px-4 text-sm text-slate-400 group-focus-within:hidden">
                    From
                  </span>
                )}
              </div>
              <span className="shrink-0 text-slate-300">→</span>
              <div className="group relative flex-1">
                <input
                  ref={returnToRef}
                  type="date"
                  className={`w-full bg-transparent px-4 py-3 text-sm focus:outline-none group-focus-within:text-slate-800 ${returnTo ? "text-slate-800" : "text-transparent"}`}
                  value={returnTo}
                  min={returnFrom || addDays(departTo || departFrom, 1)}
                  onChange={(e) => {
                    const minReturn = returnFrom || addDays(departTo || departFrom, 1);
                    const val = e.target.value < minReturn ? minReturn : e.target.value;
                    setReturnTo(val);
                    returnToRef.current?.blur();
                  }}
                />
                {!returnTo && (
                  <span className="pointer-events-none absolute inset-0 flex items-center px-4 text-sm text-slate-400 group-focus-within:hidden">
                    To
                  </span>
                )}
              </div>
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

        {/* Bags counter */}
        <div>
          <Label>Checked Bags</Label>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <button
              type="button"
              onClick={() => setBags((n) => Math.max(0, n - 1))}
              disabled={bags <= 0}
              className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            >
              −
            </button>
            <span className="w-5 text-center text-sm font-semibold text-slate-700">
              {bags}
            </span>
            <button
              type="button"
              onClick={() => setBags((n) => Math.min(3, n + 1))}
              disabled={bags >= 3}
              className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 disabled:opacity-30"
            >
              +
            </button>
            <span className="ml-1 text-sm text-slate-400">
              bag{bags !== 1 ? "s" : ""}
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
            {CURRENCIES.map(({ code, name }) => (
              <option key={code} value={code}>
                {code} – {name}
              </option>
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
      </div>

      {/* Exclude layover countries */}
      <div className="mb-4 mt-2">
        <Label>Exclude Layover Countries</Label>

        {/* Quick-select common layover hubs */}
        <div className="mb-2 flex flex-wrap gap-1.5">
          {[
            { code: "JP", name: "Japan" },
            { code: "KR", name: "South Korea" },
            { code: "CN", name: "China" },
            { code: "HK", name: "Hong Kong" },
            { code: "SG", name: "Singapore" },
            { code: "TH", name: "Thailand" },
            { code: "MY", name: "Malaysia" },
            { code: "AE", name: "United Arab Emirates" },
            { code: "TR", name: "Turkey" },
            { code: "US", name: "United States" },
            { code: "GB", name: "United Kingdom" },
            { code: "DE", name: "Germany" },
            { code: "RU", name: "Russia" },
          ].map(({ code, name }) => {
            const isExcluded = excludeLayoverCountries.includes(name) || excludeLayoverCountries.includes(code);
            return (
              <button
                key={code}
                type="button"
                onClick={() => {
                  if (isExcluded) {
                    setExcludeLayoverCountries((prev) => prev.filter((x) => x !== name && x !== code));
                  } else {
                    setExcludeLayoverCountries((prev) => [...prev, name]);
                  }
                }}
                className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                  isExcluded
                    ? "bg-red-100 text-red-700 ring-1 ring-red-300 hover:bg-red-200"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {isExcluded ? "✕ " : ""}{name}
              </button>
            );
          })}
        </div>

        <div className="relative rounded-xl border border-slate-200 bg-white shadow-sm focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-100">
          {/* Custom tags (from text input) */}
          {excludeLayoverCountries.filter(
            (c) =>
              !["Japan","South Korea","China","Hong Kong","Singapore","Thailand","Malaysia",
                "United Arab Emirates","Turkey","United States","United Kingdom","Germany","Russia",
                "JP","KR","CN","HK","SG","TH","MY","AE","TR","US","GB","DE","RU"].includes(c)
          ).length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-3 pt-2.5">
              {excludeLayoverCountries
                .filter(
                  (c) =>
                    !["Japan","South Korea","China","Hong Kong","Singapore","Thailand","Malaysia",
                      "United Arab Emirates","Turkey","United States","United Kingdom","Germany","Russia",
                      "JP","KR","CN","HK","SG","TH","MY","AE","TR","US","GB","DE","RU"].includes(c)
                )
                .map((c) => (
                  <span key={c} className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                    {c}
                    <button
                      type="button"
                      onClick={() => setExcludeLayoverCountries((prev) => prev.filter((x) => x !== c))}
                      className="ml-0.5 text-red-400 hover:text-red-600"
                      aria-label={`Remove ${c}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
            </div>
          )}
          <div className="flex items-center gap-2 px-3 py-2">
            <input
              type="text"
              value={excludeCountryInput}
              onChange={(e) => {
                setExcludeCountryInput(e.target.value);
                setCountryDropdownOpen(true);
                setCountryActiveIdx(-1);
              }}
              onFocus={() => { if (excludeCountryInput.trim()) setCountryDropdownOpen(true); }}
              onBlur={() => setTimeout(() => setCountryDropdownOpen(false), 150)}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setCountryActiveIdx((i) => Math.min(i + 1, countrySuggestions.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setCountryActiveIdx((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  if (countryActiveIdx >= 0 && countrySuggestions[countryActiveIdx]) {
                    addExcludeCountry(countrySuggestions[countryActiveIdx]);
                  } else if (excludeCountryInput.trim()) {
                    // fallback: add raw text
                    const val = excludeCountryInput.trim();
                    if (!excludeLayoverCountries.includes(val)) {
                      setExcludeLayoverCountries((prev) => [...prev, val]);
                    }
                    setExcludeCountryInput("");
                    setCountryDropdownOpen(false);
                  }
                } else if (e.key === "Escape") {
                  setCountryDropdownOpen(false);
                }
              }}
              placeholder="Search more countries to exclude…"
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
            />
          </div>
          {/* Country autocomplete dropdown */}
          {countryDropdownOpen && countrySuggestions.length > 0 && (
            <ul
              ref={countryDropdownRef}
              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl"
            >
              {countrySuggestions.map((c, i) => (
                <li
                  key={c.code}
                  onMouseDown={() => addExcludeCountry(c)}
                  className={`flex cursor-pointer items-center gap-3 px-4 py-2.5 text-sm transition ${
                    i === countryActiveIdx ? "bg-sky-50" : "hover:bg-slate-50"
                  } ${i > 0 ? "border-t border-slate-50" : ""}`}
                >
                  <span className="w-8 shrink-0 font-bold text-slate-500">{c.code}</span>
                  <span className="text-slate-700">{c.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Bottom row: search button */}
      <div className="flex flex-wrap items-end gap-4">

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
