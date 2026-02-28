# fly-panner

> Find the cheapest flights across a flexible range of departure and return dates.

fly-panner is a Next.js web app that fans out flight searches across every date combination in your chosen window and surfaces the best deals at a glance — powered by the [Amadeus Self-Service API](https://developers.amadeus.com/).

---

## Features

- **Flexible date windows** – specify a range of acceptable departure (and return) dates; fly-panner checks every valid combination concurrently.
- **One-way & round-trip** – toggle between itinerary types with a single click.
- **Sortable results** – sort by price, departure date, duration, or number of stops.
- **CSV export** – download results for offline analysis.
- **Free to run** – the Amadeus test tier is free and sufficient for personal use.

---

## Getting started

### 1. Get API credentials

Sign up at <https://developers.amadeus.com/> and create an app to receive your **API Key** and **API Secret**.

### 2. Configure environment variables

```bash
cd web
cp .env.local.example .env.local
# Open .env.local and fill in your credentials:
#   AMADEUS_API_KEY=your_key_here
#   AMADEUS_API_SECRET=your_secret_here
```

### 3. Run the app

```bash
npm install
npm run dev
```

Open <http://localhost:3000> in your browser.

---

## Production build

```bash
npm run build
npm start
```

---

## Tech stack

- **Next.js 14** (App Router) — frontend + API routes
- **TypeScript** — end-to-end type safety
- **Tailwind CSS** — styling
- **Amadeus Self-Service API** — live flight pricing data

---

## Notes on API quotas

The Amadeus **test** environment allows ~10 requests/second. The app caps searches at 100 date combinations and runs up to 6 concurrent requests to stay within limits.

Switch to a production key in `.env.local` when you need live pricing data.

---

## License

MIT
