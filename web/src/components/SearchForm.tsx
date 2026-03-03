"use client";

import { useState, useMemo } from "react";
import type { SearchParams } from "@/lib/types";
import { rangeLength } from "@/lib/dateRange";
import AirportCombobox from "./AirportCombobox";

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
