"""Core search logic: iterate over date ranges and aggregate flight offers."""

from __future__ import annotations

import itertools
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date
from typing import Callable, Iterator, Optional

from fly_panner.models import DateRange, FlightOffer

logger = logging.getLogger(__name__)

# Conservative default to stay within Amadeus free-tier rate limits
_DEFAULT_MAX_WORKERS = 4


def _search_one(
    client,
    origin: str,
    destination: str,
    departure_date: date,
    return_date: Optional[date],
    adults: int,
    currency: str,
    max_per_date: int,
) -> list[FlightOffer]:
    """Single-date search, called from a thread pool."""
    label = (
        f"{origin}→{destination} depart={departure_date}"
        + (f" return={return_date}" if return_date else "")
    )
    logger.debug("Searching: %s", label)
    results = client.search(
        origin=origin,
        destination=destination,
        departure_date=departure_date,
        return_date=return_date,
        adults=adults,
        currency=currency,
        max_results=max_per_date,
    )
    logger.debug("Found %d offer(s) for %s", len(results), label)
    return results


class FlightSearcher:
    """
    Search for the cheapest flights across a range of departure and return dates.

    Parameters
    ----------
    client:
        An :class:`~fly_panner.amadeus_client.AmadeusFlightClient` instance
        (or any object with a compatible ``search`` method).
    max_workers:
        Number of parallel threads used to issue API requests.
    progress_callback:
        Optional callable that receives ``(completed: int, total: int)``
        after each date-pair search finishes.
    """

    def __init__(
        self,
        client,
        max_workers: int = _DEFAULT_MAX_WORKERS,
        progress_callback: Optional[Callable[[int, int], None]] = None,
    ) -> None:
        self._client = client
        self._max_workers = max_workers
        self._progress_callback = progress_callback

    def search(
        self,
        origin: str,
        destination: str,
        departure_range: DateRange,
        return_range: Optional[DateRange] = None,
        adults: int = 1,
        currency: str = "USD",
        max_per_date: int = 5,
        top_n: int = 10,
    ) -> list[FlightOffer]:
        """
        Search all departure × return date combinations and return the cheapest offers.

        Parameters
        ----------
        origin:
            IATA airport/city code for the departure location (e.g. ``"JFK"``).
        destination:
            IATA airport/city code for the arrival location (e.g. ``"LHR"``).
        departure_range:
            Range of acceptable departure dates.
        return_range:
            Range of acceptable return dates (omit for one-way searches).
        adults:
            Number of adult passengers.
        currency:
            Three-letter ISO currency code (default ``"USD"``).
        max_per_date:
            Maximum offers to fetch per date combination.
        top_n:
            How many cheapest offers to return overall (``0`` = all).

        Returns
        -------
        list[FlightOffer]
            Offers sorted by price ascending, limited to *top_n* entries.
        """
        date_pairs = list(self._date_pairs(departure_range, return_range))
        total = len(date_pairs)
        logger.info(
            "Searching %d date combination(s) for %s→%s",
            total, origin, destination,
        )

        all_offers: list[FlightOffer] = []
        completed = 0

        with ThreadPoolExecutor(max_workers=self._max_workers) as pool:
            future_to_pair = {
                pool.submit(
                    _search_one,
                    self._client,
                    origin,
                    destination,
                    dep,
                    ret,
                    adults,
                    currency,
                    max_per_date,
                ): (dep, ret)
                for dep, ret in date_pairs
            }

            for future in as_completed(future_to_pair):
                dep, ret = future_to_pair[future]
                try:
                    offers = future.result()
                    all_offers.extend(offers)
                except Exception as exc:  # pragma: no cover
                    logger.warning(
                        "Unexpected error for depart=%s return=%s: %s",
                        dep, ret, exc,
                    )
                finally:
                    completed += 1
                    if self._progress_callback:
                        self._progress_callback(completed, total)

        all_offers.sort(key=lambda o: o.price)
        if top_n:
            all_offers = all_offers[:top_n]

        logger.info("Returning %d offer(s) after deduplication.", len(all_offers))
        return all_offers

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _date_pairs(
        departure_range: DateRange,
        return_range: Optional[DateRange],
    ) -> Iterator[tuple[date, Optional[date]]]:
        """Yield (departure_date, return_date | None) pairs.

        When a return range is given, only pairs where
        ``return_date >= departure_date`` are produced.
        """
        if return_range is None:
            for dep in departure_range.dates():
                yield dep, None
        else:
            for dep, ret in itertools.product(
                departure_range.dates(), return_range.dates()
            ):
                if ret >= dep:
                    yield dep, ret
