"""Command-line interface for fly-panner."""

from __future__ import annotations

import logging
import sys
from datetime import date, datetime
from typing import Optional

import click
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, BarColumn, TaskProgressColumn, TimeRemainingColumn

from fly_panner import __version__
from fly_panner.models import DateRange

console = Console(stderr=True)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _parse_date(ctx, param, value: Optional[str]) -> Optional[date]:
    if value is None:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    raise click.BadParameter(
        f"Could not parse '{value}'. Use YYYY-MM-DD (e.g. 2025-06-01).",
        param=param,
    )


def _make_date_range(name: str, start: date, end: Optional[date]) -> DateRange:
    if end is None:
        end = start
    try:
        return DateRange(start=start, end=end)
    except ValueError as exc:
        raise click.UsageError(str(exc)) from exc


# ---------------------------------------------------------------------------
# Main command
# ---------------------------------------------------------------------------

@click.command(name="fly-panner")
@click.version_option(__version__, prog_name="fly-panner")
# Positional args
@click.argument("origin")
@click.argument("destination")
# Departure range
@click.option(
    "--depart-from", "depart_from", required=True,
    metavar="DATE",
    callback=_parse_date, is_eager=False, expose_value=True,
    help="Earliest acceptable departure date (YYYY-MM-DD).",
)
@click.option(
    "--depart-to", "depart_to", default=None,
    metavar="DATE",
    callback=_parse_date, is_eager=False, expose_value=True,
    help="Latest acceptable departure date. Defaults to --depart-from.",
)
# Return range (round-trip)
@click.option(
    "--return-from", "return_from", default=None,
    metavar="DATE",
    callback=_parse_date, is_eager=False, expose_value=True,
    help="Earliest acceptable return date (for round trips).",
)
@click.option(
    "--return-to", "return_to", default=None,
    metavar="DATE",
    callback=_parse_date, is_eager=False, expose_value=True,
    help="Latest acceptable return date. Defaults to --return-from.",
)
# Search options
@click.option(
    "--adults", default=1, show_default=True,
    help="Number of adult passengers.",
)
@click.option(
    "--currency", default="USD", show_default=True,
    metavar="CODE",
    help="3-letter ISO currency code (e.g. EUR, GBP).",
)
@click.option(
    "--top", "top_n", default=10, show_default=True,
    help="Number of cheapest results to display.",
)
@click.option(
    "--max-per-date", default=5, show_default=True,
    help="Maximum offers fetched per date combination.",
)
@click.option(
    "--workers", default=4, show_default=True,
    help="Parallel API request threads (respect API rate limits).",
)
# Output format
@click.option(
    "--output", "-o",
    type=click.Choice(["table", "json", "csv"], case_sensitive=False),
    default="table", show_default=True,
    help="Output format.",
)
# Amadeus credentials
@click.option(
    "--api-key", envvar="AMADEUS_API_KEY", required=True,
    metavar="KEY",
    help="Amadeus API key (or set AMADEUS_API_KEY env var).",
)
@click.option(
    "--api-secret", envvar="AMADEUS_API_SECRET", required=True,
    metavar="SECRET",
    help="Amadeus API secret (or set AMADEUS_API_SECRET env var).",
)
@click.option(
    "--api-env",
    type=click.Choice(["test", "production"], case_sensitive=False),
    default="test", show_default=True,
    help="Amadeus API environment.",
)
# Verbosity
@click.option("-v", "--verbose", is_flag=True, help="Enable debug logging.")
def main(
    origin: str,
    destination: str,
    depart_from: date,
    depart_to: Optional[date],
    return_from: Optional[date],
    return_to: Optional[date],
    adults: int,
    currency: str,
    top_n: int,
    max_per_date: int,
    workers: int,
    output: str,
    api_key: str,
    api_secret: str,
    api_env: str,
    verbose: bool,
) -> None:
    """Find the cheapest flights from ORIGIN to DESTINATION within a date range.

    ORIGIN and DESTINATION are IATA airport or city codes (e.g. JFK, LHR).

    \b
    Examples
    --------
    One-way, single date:
      fly-panner JFK LHR --depart-from 2025-06-01

    One-way, flexible departure window:
      fly-panner JFK LHR --depart-from 2025-06-01 --depart-to 2025-06-07

    Round-trip with flexible dates:
      fly-panner JFK LHR \\
        --depart-from 2025-06-01 --depart-to 2025-06-07 \\
        --return-from 2025-06-14 --return-to 2025-06-21

    Output as CSV:
      fly-panner JFK LHR --depart-from 2025-06-01 --output csv > results.csv
    """
    if verbose:
        logging.basicConfig(level=logging.DEBUG, stream=sys.stderr)
    else:
        logging.basicConfig(level=logging.WARNING, stream=sys.stderr)

    # Build date ranges
    departure_range = _make_date_range("departure", depart_from, depart_to)
    return_range: Optional[DateRange] = None
    if return_from:
        return_range = _make_date_range("return", return_from, return_to)

    total_combinations = len(departure_range) * (len(return_range) if return_range else 1)

    # Warn about large search spaces
    if total_combinations > 50:
        console.print(
            f"[yellow]Warning:[/yellow] Searching [bold]{total_combinations}[/bold] date "
            "combinations. This may take a while and consume significant API quota."
        )

    # Import here so startup is fast even without the amadeus package installed
    from fly_panner.amadeus_client import AmadeusFlightClient
    from fly_panner.search import FlightSearcher
    from fly_panner import formatters

    try:
        client = AmadeusFlightClient(
            api_key=api_key,
            api_secret=api_secret,
            hostname=api_env,
        )
    except ImportError as exc:
        console.print(f"[red]Error:[/red] {exc}")
        sys.exit(1)

    # Progress tracking
    completed_tasks = [0]

    if output == "table":
        progress = Progress(
            SpinnerColumn(),
            "[progress.description]{task.description}",
            BarColumn(),
            TaskProgressColumn(),
            TimeRemainingColumn(),
            console=console,
            transient=True,
        )
        task_id = progress.add_task(
            f"Searching {origin.upper()} → {destination.upper()}…",
            total=total_combinations,
        )

        def on_progress(done: int, total: int) -> None:
            progress.update(task_id, completed=done)

        with progress:
            searcher = FlightSearcher(
                client=client,
                max_workers=workers,
                progress_callback=on_progress,
            )
            offers = searcher.search(
                origin=origin,
                destination=destination,
                departure_range=departure_range,
                return_range=return_range,
                adults=adults,
                currency=currency,
                max_per_date=max_per_date,
                top_n=top_n,
            )
    else:
        searcher = FlightSearcher(client=client, max_workers=workers)
        offers = searcher.search(
            origin=origin,
            destination=destination,
            departure_range=departure_range,
            return_range=return_range,
            adults=adults,
            currency=currency,
            max_per_date=max_per_date,
            top_n=top_n,
        )

    # Emit results
    fmt = output.lower()
    if fmt == "table":
        formatters.print_table(offers, file=sys.stdout)
    elif fmt == "json":
        formatters.print_json(offers, file=sys.stdout)
    elif fmt == "csv":
        formatters.print_csv(offers, file=sys.stdout)

    if not offers and fmt == "table":
        sys.exit(1)
