# fly-panner

> Find the cheapest flights within a departure and return date range.

`fly-panner` is a command-line tool that searches for the lowest-priced flights
across a flexible window of departure (and optionally return) dates.
Instead of checking prices one day at a time, it fans out across your entire
date range concurrently and surfaces the best deals at a glance.

---

## Features

- **Flexible date ranges** – specify a window of acceptable departure and return
  dates; `fly-panner` checks every valid combination.
- **Concurrent search** – date combinations are queried in parallel so results
  arrive quickly.
- **Multiple output formats** – rich terminal table, JSON, and CSV.
- **Round-trip & one-way** – works for both itinerary types.
- **Powered by Amadeus** – uses the [Amadeus Self-Service API](https://developers.amadeus.com/)
  which has a free test tier.

---

## Installation

### From source

```bash
git clone https://github.com/renhotsai/fly-panner.git
cd fly-panner
pip install .
```

### Requirements

- Python 3.9+
- An [Amadeus Self-Service API](https://developers.amadeus.com/) account
  (free registration – a test key is all you need to get started)

---

## Quick start

### 1. Get API credentials

Sign up at <https://developers.amadeus.com/> and create an app to receive your
**API Key** and **API Secret**.

### 2. Export credentials

```bash
export AMADEUS_API_KEY="your_key_here"
export AMADEUS_API_SECRET="your_secret_here"
```

Alternatively, pass them directly with `--api-key` / `--api-secret`.

### 3. Search

**One-way, single date:**
```bash
fly-panner JFK LHR --depart-from 2025-06-01
```

**One-way, flexible departure window:**
```bash
fly-panner JFK LHR --depart-from 2025-06-01 --depart-to 2025-06-07
```

**Round-trip with flexible dates:**
```bash
fly-panner JFK LHR \
  --depart-from 2025-06-01 --depart-to 2025-06-07 \
  --return-from 2025-06-14 --return-to 2025-06-21
```

**Save results to CSV:**
```bash
fly-panner JFK LHR \
  --depart-from 2025-06-01 --depart-to 2025-06-07 \
  --return-from 2025-06-14 --return-to 2025-06-21 \
  --output csv > results.csv
```

---

## Usage reference

```
Usage: fly-panner [OPTIONS] ORIGIN DESTINATION

  Find the cheapest flights from ORIGIN to DESTINATION within a date range.

  ORIGIN and DESTINATION are IATA airport or city codes (e.g. JFK, LHR).

Options:
  --version                     Show the version and exit.
  --depart-from DATE            Earliest acceptable departure date (YYYY-MM-DD).  [required]
  --depart-to DATE              Latest acceptable departure date. Defaults to --depart-from.
  --return-from DATE            Earliest acceptable return date (for round trips).
  --return-to DATE              Latest acceptable return date. Defaults to --return-from.
  --adults INTEGER              Number of adult passengers.  [default: 1]
  --currency CODE               3-letter ISO currency code (e.g. EUR, GBP).  [default: USD]
  --top INTEGER                 Number of cheapest results to display.  [default: 10]
  --max-per-date INTEGER        Maximum offers fetched per date combination.  [default: 5]
  --workers INTEGER             Parallel API request threads.  [default: 4]
  -o, --output [table|json|csv] Output format.  [default: table]
  --api-key KEY                 Amadeus API key (or set AMADEUS_API_KEY env var).
  --api-secret SECRET           Amadeus API secret (or set AMADEUS_API_SECRET env var).
  --api-env [test|production]   Amadeus API environment.  [default: test]
  -v, --verbose                 Enable debug logging.
  --help                        Show this message and exit.
```

---

## Example output

```
╭────────────────────────────── Cheapest Flights ───────────────────────────────╮
│ #   Price          Depart      From → To     Duration  Stops  Carrier(s)  Return      Trip Length │
│ 1   $342.50 USD    2025-06-03  JFK → LHR     7h 15m    Direct BA          2025-06-17  14d         │
│ 2   $389.00 USD    2025-06-01  JFK → LHR     7h 20m    Direct AA          2025-06-15  14d         │
│ 3   $412.00 USD    2025-06-05  JFK → LHR     9h 05m    1      UA          2025-06-19  14d         │
╰───────────────────────────────────────────────────────────────────────────────╯
Showing 3 offer(s). Prices per person, all taxes included.
```

---

## Notes on API quotas

The Amadeus **test** environment has rate limits (~10 requests/second).
`fly-panner` respects these limits by:

- Defaulting to 4 concurrent workers (`--workers`).
- Retrying on 429 responses with exponential back-off.

For large date windows (>50 combinations) a warning is shown before the search begins.

Switch to `--api-env production` once you are ready to use live pricing data
(requires a production key from Amadeus).

---

## Web UI (Next.js)

A browser-based interface is available in the `web/` directory.

### Setup

```bash
cd web
cp .env.local.example .env.local
# Edit .env.local and add your Amadeus credentials

npm install
npm run dev
```

Open <http://localhost:3000> in your browser. The search form lets you enter
airport codes, a departure window, and an optional return window. Results
appear in a sortable table and can be downloaded as CSV.

### Production build

```bash
npm run build
npm start
```

---

## Development (CLI)

```bash
pip install -e ".[dev]"
pytest
```

---

## License

MIT
