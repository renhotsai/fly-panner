# fly-panner

> Find the cheapest flights across a flexible range of departure and return dates.

fly-panner is a Next.js web app that fans out flight searches across every date combination in your chosen window and surfaces the best deals at a glance — powered by the [Duffel Air API](https://duffel.com/).

---

## Features

- **Flexible date windows** – specify a range of acceptable departure (and return) dates; fly-panner checks every valid combination concurrently.
- **One-way & round-trip** – toggle between itinerary types with a single click.
- **Direct-only filter** – limit results to non-stop flights.
- **Sortable results** – sort by price, departure date, duration, or number of stops.
- **CSV export** – download results for offline analysis.
- **Weekly email alerts** – subscribe to receive the best fares for a saved route every Monday via email.
- **One-click unsubscribe** – every alert email includes a secure unsubscribe link.
- **Free to run** – the Duffel test sandbox is free and sufficient for personal use.

---

## Getting started

### 1. Get API credentials

#### Duffel Air API
Sign up at <https://duffel.com/> and create an app to get your **API token** (starts with `duffel_test_...` for sandbox).

#### Resend (email alerts)
Sign up at <https://resend.com/>, verify your sending domain, and obtain your **API key**.

#### Neon (PostgreSQL)
Create a free database at <https://neon.tech/> and copy the **pooled** and **direct** connection strings.

### 2. Configure environment variables

```bash
cd web
cp .env.local.example .env.local
```

Edit `.env.local`:

```bash
# Duffel Air API
DUFFEL_API_KEY=duffel_test_xxxxxxxxxxxx

# PostgreSQL (Neon recommended)
DATABASE_URL="postgresql://..."      # Pooled connection (with ?pgbouncer=true)
DIRECT_URL="postgresql://..."        # Direct connection for migrations

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM=alerts@yourdomain.com    # Must be a verified domain on Resend

# Cron job protection
CRON_SECRET=change_me_to_a_random_string

# Public app URL (used in unsubscribe links)
NEXT_PUBLIC_BASE_URL=http://localhost:3000
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
npm run build   # runs: prisma generate && prisma db push && next build
npm start
```

The build step automatically applies any pending database migrations via `prisma db push`.

---

## Vercel deployment

1. Import the repo in Vercel and set all environment variables above.
2. Set the **Root Directory** to `web`.
3. Add a Vercel Cron job to send weekly alerts:
   - **Path:** `/api/cron/send-alerts`
   - **Schedule:** `0 0 * * 1` (every Monday at midnight UTC)
   - **Authorization:** pass `CRON_SECRET` as a Bearer token or `?secret=` query param.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3 |
| ORM | Prisma 5 |
| Database | PostgreSQL (Neon serverless) |
| Flight data | Duffel Air API |
| Email | Resend |
| Deployment | Vercel |

---

## API routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/search` | POST | Search flights across all date combinations (max 50) |
| `/api/airports` | GET | Airport autocomplete (`?keyword=...`) |
| `/api/subscribe` | POST | Save a flight alert subscription |
| `/api/unsubscribe` | GET | Deactivate a subscription via token link |
| `/api/cron/send-alerts` | GET | Send weekly email alerts (Vercel Cron) |

---

## Notes on API quotas

- **Max date combinations:** 50 per search (enforced in `/api/search`)
- **Max concurrent workers:** 4 (respects Duffel rate limits)
- **Cron job:** evaluates up to 20 date pairs per subscription

Switch from a `duffel_test_...` token to a live token in `.env.local` when you need real pricing data.

---

## License

MIT
