"""Amadeus API client wrapper for flight search."""

from __future__ import annotations

import logging
import time
from datetime import date
from typing import Any, Optional

try:
    from amadeus import Client, ResponseError
    AMADEUS_AVAILABLE = True
except ImportError:
    AMADEUS_AVAILABLE = False
    Client = None  # type: ignore[assignment,misc]
    ResponseError = Exception  # type: ignore[assignment,misc]

from fly_panner.models import FlightItinerary, FlightOffer, FlightSegment

logger = logging.getLogger(__name__)

# Maximum offers to request per API call
_MAX_OFFERS_PER_CALL = 10


def _parse_itinerary(raw: dict[str, Any]) -> FlightItinerary:
    segments = tuple(
        FlightSegment(
            departure_airport=seg["departure"]["iataCode"],
            arrival_airport=seg["arrival"]["iataCode"],
            departure_time=seg["departure"]["at"],
            arrival_time=seg["arrival"]["at"],
            carrier=seg.get("operating", seg)["carrierCode"],
            flight_number=seg["number"],
            duration=seg["duration"],
        )
        for seg in raw["segments"]
    )
    return FlightItinerary(segments=segments)


def _parse_offer(raw: dict[str, Any]) -> FlightOffer:
    price = float(raw["price"]["grandTotal"])
    currency = raw["price"]["currency"]
    itineraries = raw["itineraries"]

    outbound = _parse_itinerary(itineraries[0])
    inbound = _parse_itinerary(itineraries[1]) if len(itineraries) > 1 else None

    # travelerPricings[0].fareDetailsBySegment may carry seat availability
    seats: Optional[int] = None
    try:
        seats = int(raw["numberOfBookableSeats"])
    except (KeyError, TypeError, ValueError):
        pass

    return FlightOffer(
        price=price,
        currency=currency,
        outbound=outbound,
        inbound=inbound,
        seats_remaining=seats,
    )


class AmadeusFlightClient:
    """Thin wrapper around the Amadeus Python SDK for flight offer searches."""

    def __init__(
        self,
        api_key: str,
        api_secret: str,
        hostname: str = "test",  # 'test' or 'production'
    ) -> None:
        if not AMADEUS_AVAILABLE:
            raise ImportError(
                "The 'amadeus' package is required. Install it with:\n"
                "  pip install amadeus"
            )
        self._client = Client(
            client_id=api_key,
            client_secret=api_secret,
            hostname=hostname,
            log_level="silent",
        )

    def search(
        self,
        origin: str,
        destination: str,
        departure_date: date,
        return_date: Optional[date] = None,
        adults: int = 1,
        currency: str = "USD",
        max_results: int = _MAX_OFFERS_PER_CALL,
        retries: int = 3,
    ) -> list[FlightOffer]:
        """
        Search for flight offers for a specific departure (and optional return) date.

        Returns a list of :class:`FlightOffer` objects sorted by price ascending.
        Returns an empty list when no offers are found or a non-fatal API error occurs.
        """
        params: dict[str, Any] = {
            "originLocationCode": origin.upper(),
            "destinationLocationCode": destination.upper(),
            "departureDate": departure_date.isoformat(),
            "adults": adults,
            "currencyCode": currency,
            "max": min(max_results, _MAX_OFFERS_PER_CALL),
        }
        if return_date:
            params["returnDate"] = return_date.isoformat()

        last_exc: Optional[Exception] = None
        for attempt in range(retries):
            try:
                response = self._client.shopping.flight_offers_search.get(**params)
                offers = [_parse_offer(o) for o in response.data]
                return sorted(offers, key=lambda o: o.price)
            except ResponseError as exc:
                status = getattr(exc, "response", None)
                code = getattr(status, "status_code", None) if status else None
                if code == 429:
                    # Rate-limited: wait and retry
                    wait = 2 ** attempt
                    logger.warning(
                        "Rate limited (429). Waiting %ss before retry %d/%d.",
                        wait, attempt + 1, retries,
                    )
                    time.sleep(wait)
                    last_exc = exc
                    continue
                if code and 400 <= code < 500:
                    # Client error (e.g. no routes for these dates) – not retryable
                    logger.debug(
                        "No results for %s→%s on %s (HTTP %s): %s",
                        origin, destination, departure_date, code, exc,
                    )
                    return []
                # Server-side or unknown error – retry with backoff
                wait = 2 ** attempt
                logger.warning(
                    "API error (HTTP %s). Waiting %ss before retry %d/%d: %s",
                    code, wait, attempt + 1, retries, exc,
                )
                time.sleep(wait)
                last_exc = exc

        logger.error("All %d retries exhausted: %s", retries, last_exc)
        return []
