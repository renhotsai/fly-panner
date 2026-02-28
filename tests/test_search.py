"""Tests for fly_panner.search."""

from datetime import date
from unittest.mock import MagicMock, patch

import pytest

from fly_panner.models import DateRange, FlightItinerary, FlightOffer, FlightSegment
from fly_panner.search import FlightSearcher


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_offer(price: float, dep_date: str = "2025-06-01") -> FlightOffer:
    seg = FlightSegment(
        departure_airport="JFK",
        arrival_airport="LHR",
        departure_time=f"{dep_date}T08:00:00",
        arrival_time=f"{dep_date}T20:00:00",
        carrier="BA",
        flight_number="178",
        duration="PT12H00M",
    )
    return FlightOffer(
        price=price,
        currency="USD",
        outbound=FlightItinerary(segments=(seg,)),
    )


def _make_client(offers_map: dict) -> MagicMock:
    """Mock client whose search() returns offers_map[(dep, ret)]."""
    client = MagicMock()

    def _search(origin, destination, departure_date, return_date=None, **kwargs):
        return offers_map.get((departure_date, return_date), [])

    client.search.side_effect = _search
    return client


# ---------------------------------------------------------------------------
# _date_pairs
# ---------------------------------------------------------------------------

class TestDatePairs:
    def test_one_way_single_date(self):
        dr = DateRange(date(2025, 6, 1), date(2025, 6, 1))
        pairs = list(FlightSearcher._date_pairs(dr, None))
        assert pairs == [(date(2025, 6, 1), None)]

    def test_one_way_range(self):
        dr = DateRange(date(2025, 6, 1), date(2025, 6, 3))
        pairs = list(FlightSearcher._date_pairs(dr, None))
        assert len(pairs) == 3
        assert all(ret is None for _, ret in pairs)

    def test_round_trip_excludes_return_before_departure(self):
        dep = DateRange(date(2025, 6, 3), date(2025, 6, 4))
        ret = DateRange(date(2025, 6, 1), date(2025, 6, 5))
        pairs = list(FlightSearcher._date_pairs(dep, ret))
        for d, r in pairs:
            assert r >= d

    def test_round_trip_includes_same_day(self):
        dep = DateRange(date(2025, 6, 1), date(2025, 6, 1))
        ret = DateRange(date(2025, 6, 1), date(2025, 6, 1))
        pairs = list(FlightSearcher._date_pairs(dep, ret))
        assert (date(2025, 6, 1), date(2025, 6, 1)) in pairs


# ---------------------------------------------------------------------------
# FlightSearcher.search
# ---------------------------------------------------------------------------

class TestFlightSearcherSearch:
    def test_returns_sorted_by_price(self):
        dep_date = date(2025, 6, 1)
        client = _make_client({
            (dep_date, None): [_make_offer(500), _make_offer(300), _make_offer(400)],
        })
        searcher = FlightSearcher(client=client, max_workers=1)
        results = searcher.search(
            origin="JFK",
            destination="LHR",
            departure_range=DateRange(dep_date, dep_date),
        )
        prices = [o.price for o in results]
        assert prices == sorted(prices)

    def test_top_n_limits_results(self):
        dep_date = date(2025, 6, 1)
        client = _make_client({
            (dep_date, None): [_make_offer(p) for p in [100, 200, 300, 400, 500]],
        })
        searcher = FlightSearcher(client=client, max_workers=1)
        results = searcher.search(
            origin="JFK",
            destination="LHR",
            departure_range=DateRange(dep_date, dep_date),
            top_n=3,
        )
        assert len(results) == 3
        assert results[0].price == 100

    def test_aggregates_across_dates(self):
        d1 = date(2025, 6, 1)
        d2 = date(2025, 6, 2)
        client = _make_client({
            (d1, None): [_make_offer(300, str(d1))],
            (d2, None): [_make_offer(200, str(d2))],
        })
        searcher = FlightSearcher(client=client, max_workers=2)
        results = searcher.search(
            origin="JFK",
            destination="LHR",
            departure_range=DateRange(d1, d2),
        )
        assert len(results) == 2
        assert results[0].price == 200  # cheaper comes first

    def test_empty_when_no_offers(self):
        dep_date = date(2025, 6, 1)
        client = _make_client({})
        searcher = FlightSearcher(client=client, max_workers=1)
        results = searcher.search(
            origin="JFK",
            destination="LHR",
            departure_range=DateRange(dep_date, dep_date),
        )
        assert results == []

    def test_progress_callback_called(self):
        dep_date = date(2025, 6, 1)
        client = _make_client({(dep_date, None): []})
        calls = []
        searcher = FlightSearcher(
            client=client,
            max_workers=1,
            progress_callback=lambda done, total: calls.append((done, total)),
        )
        searcher.search(
            origin="JFK",
            destination="LHR",
            departure_range=DateRange(dep_date, dep_date),
        )
        assert calls == [(1, 1)]
