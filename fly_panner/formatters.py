"""Output formatters: rich table, JSON, and CSV."""

from __future__ import annotations

import csv
import io
import json
import sys
from typing import TextIO

from rich.console import Console
from rich.table import Table
from rich import box

from fly_panner.models import FlightOffer

__all__ = ["print_table", "print_json", "print_csv"]


# ---------------------------------------------------------------------------
# Rich table
# ---------------------------------------------------------------------------

def print_table(offers: list[FlightOffer], file: TextIO = sys.stdout) -> None:
    """Render *offers* as a rich terminal table."""
    console = Console(file=file)

    if not offers:
        console.print("[yellow]No flights found for the given criteria.[/yellow]")
        return

    is_round_trip = any(o.is_round_trip for o in offers)

    table = Table(
        box=box.ROUNDED,
        show_header=True,
        header_style="bold cyan",
        title="[bold]Cheapest Flights[/bold]",
        title_style="bold white",
    )

    table.add_column("#", style="dim", justify="right", no_wrap=True)
    table.add_column("Price", justify="right", style="bold green")
    table.add_column("Depart", no_wrap=True)
    table.add_column("From → To", no_wrap=True)
    table.add_column("Duration", justify="center")
    table.add_column("Stops", justify="center")
    table.add_column("Carrier(s)")

    if is_round_trip:
        table.add_column("Return", no_wrap=True)
        table.add_column("Trip Length", justify="center")

    for idx, offer in enumerate(offers, start=1):
        out = offer.outbound
        stops_str = "Direct" if out.stops == 0 else str(out.stops)
        carriers_str = ", ".join(out.carriers)

        row = [
            str(idx),
            f"{offer.price:,.2f} {offer.currency}",
            offer.departure_date,
            f"{out.origin} → {out.destination}",
            out.total_duration_pretty,
            stops_str,
            carriers_str,
        ]

        if is_round_trip:
            if offer.inbound:
                row.append(offer.return_date or "")
                row.append(f"{offer.trip_duration_days}d" if offer.trip_duration_days is not None else "")
            else:
                row += ["—", "—"]

        table.add_row(*row)

    console.print(table)
    console.print(
        f"[dim]Showing {len(offers)} offer(s). Prices per person, all taxes included.[/dim]"
    )


# ---------------------------------------------------------------------------
# JSON
# ---------------------------------------------------------------------------

def _offer_to_dict(offer: FlightOffer) -> dict:
    def itinerary_dict(it):
        return {
            "origin": it.origin,
            "destination": it.destination,
            "departure_date": it.departure_date,
            "arrival_date": it.arrival_date,
            "stops": it.stops,
            "duration_minutes": it.total_duration_minutes,
            "carriers": it.carriers,
            "segments": [
                {
                    "from": s.departure_airport,
                    "to": s.arrival_airport,
                    "departs": s.departure_time,
                    "arrives": s.arrival_time,
                    "carrier": s.carrier,
                    "flight": s.flight_number,
                    "duration": s.duration,
                }
                for s in it.segments
            ],
        }

    return {
        "price": offer.price,
        "currency": offer.currency,
        "departure_date": offer.departure_date,
        "return_date": offer.return_date,
        "trip_duration_days": offer.trip_duration_days,
        "seats_remaining": offer.seats_remaining,
        "outbound": itinerary_dict(offer.outbound),
        "inbound": itinerary_dict(offer.inbound) if offer.inbound else None,
    }


def print_json(offers: list[FlightOffer], file: TextIO = sys.stdout) -> None:
    """Write *offers* as a JSON array."""
    data = [_offer_to_dict(o) for o in offers]
    json.dump(data, file, indent=2, ensure_ascii=False)
    file.write("\n")


# ---------------------------------------------------------------------------
# CSV
# ---------------------------------------------------------------------------

_CSV_FIELDNAMES = [
    "rank",
    "price",
    "currency",
    "departure_date",
    "return_date",
    "trip_duration_days",
    "origin",
    "destination",
    "outbound_duration_min",
    "outbound_stops",
    "outbound_carriers",
    "inbound_duration_min",
    "inbound_stops",
    "inbound_carriers",
    "seats_remaining",
]


def print_csv(offers: list[FlightOffer], file: TextIO = sys.stdout) -> None:
    """Write *offers* as CSV rows with a header."""
    writer = csv.DictWriter(file, fieldnames=_CSV_FIELDNAMES, lineterminator="\n")
    writer.writeheader()
    for rank, offer in enumerate(offers, start=1):
        out = offer.outbound
        inn = offer.inbound
        writer.writerow({
            "rank": rank,
            "price": offer.price,
            "currency": offer.currency,
            "departure_date": offer.departure_date,
            "return_date": offer.return_date or "",
            "trip_duration_days": offer.trip_duration_days if offer.trip_duration_days is not None else "",
            "origin": out.origin,
            "destination": out.destination,
            "outbound_duration_min": out.total_duration_minutes,
            "outbound_stops": out.stops,
            "outbound_carriers": "|".join(out.carriers),
            "inbound_duration_min": inn.total_duration_minutes if inn else "",
            "inbound_stops": inn.stops if inn else "",
            "inbound_carriers": "|".join(inn.carriers) if inn else "",
            "seats_remaining": offer.seats_remaining if offer.seats_remaining is not None else "",
        })
