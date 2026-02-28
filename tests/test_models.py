"""Tests for fly_panner.models."""

import pytest
from datetime import date

from fly_panner.models import DateRange, FlightItinerary, FlightOffer, FlightSegment


# ---------------------------------------------------------------------------
# FlightSegment
# ---------------------------------------------------------------------------

def _make_segment(**kwargs) -> FlightSegment:
    defaults = dict(
        departure_airport="JFK",
        arrival_airport="LHR",
        departure_time="2025-06-01T08:00:00",
        arrival_time="2025-06-01T20:00:00",
        carrier="BA",
        flight_number="178",
        duration="PT12H00M",
    )
    defaults.update(kwargs)
    return FlightSegment(**defaults)


class TestFlightSegment:
    def test_duration_minutes(self):
        seg = _make_segment(duration="PT2H30M")
        assert seg.duration_minutes == 150

    def test_duration_minutes_hours_only(self):
        seg = _make_segment(duration="PT5H")
        assert seg.duration_minutes == 300

    def test_duration_minutes_minutes_only(self):
        seg = _make_segment(duration="PT45M")
        assert seg.duration_minutes == 45

    def test_duration_pretty(self):
        seg = _make_segment(duration="PT2H30M")
        assert seg.duration_pretty == "2h 30m"


# ---------------------------------------------------------------------------
# FlightItinerary
# ---------------------------------------------------------------------------

def _make_itinerary(segments=None) -> FlightItinerary:
    if segments is None:
        segments = (_make_segment(),)
    return FlightItinerary(segments=tuple(segments))


class TestFlightItinerary:
    def test_origin_destination(self):
        it = _make_itinerary()
        assert it.origin == "JFK"
        assert it.destination == "LHR"

    def test_stops_direct(self):
        it = _make_itinerary()
        assert it.stops == 0

    def test_stops_one_connection(self):
        it = _make_itinerary(segments=[
            _make_segment(departure_airport="JFK", arrival_airport="CDG"),
            _make_segment(departure_airport="CDG", arrival_airport="LHR"),
        ])
        assert it.stops == 1

    def test_total_duration(self):
        it = _make_itinerary(segments=[
            _make_segment(duration="PT2H00M"),
            _make_segment(duration="PT1H30M"),
        ])
        assert it.total_duration_minutes == 210
        assert it.total_duration_pretty == "3h 30m"

    def test_carriers_deduped(self):
        it = _make_itinerary(segments=[
            _make_segment(carrier="BA"),
            _make_segment(carrier="BA"),
            _make_segment(carrier="AA"),
        ])
        assert it.carriers == ["BA", "AA"]

    def test_departure_date(self):
        it = _make_itinerary()
        assert it.departure_date == "2025-06-01"


# ---------------------------------------------------------------------------
# FlightOffer
# ---------------------------------------------------------------------------

class TestFlightOffer:
    def _one_way(self) -> FlightOffer:
        return FlightOffer(
            price=350.0,
            currency="USD",
            outbound=_make_itinerary(),
        )

    def _round_trip(self) -> FlightOffer:
        inbound = FlightItinerary(segments=(_make_segment(
            departure_airport="LHR",
            arrival_airport="JFK",
            departure_time="2025-06-15T10:00:00",
            arrival_time="2025-06-15T13:00:00",
            duration="PT8H00M",
        ),))
        return FlightOffer(
            price=700.0,
            currency="USD",
            outbound=_make_itinerary(),
            inbound=inbound,
        )

    def test_one_way_is_not_round_trip(self):
        assert not self._one_way().is_round_trip

    def test_round_trip(self):
        offer = self._round_trip()
        assert offer.is_round_trip
        assert offer.return_date == "2025-06-15"
        assert offer.trip_duration_days == 14

    def test_return_date_none_for_one_way(self):
        assert self._one_way().return_date is None

    def test_trip_duration_none_for_one_way(self):
        assert self._one_way().trip_duration_days is None


# ---------------------------------------------------------------------------
# DateRange
# ---------------------------------------------------------------------------

class TestDateRange:
    def test_single_day(self):
        dr = DateRange(start=date(2025, 6, 1), end=date(2025, 6, 1))
        days = list(dr.dates())
        assert days == [date(2025, 6, 1)]
        assert len(dr) == 1

    def test_multi_day(self):
        dr = DateRange(start=date(2025, 6, 1), end=date(2025, 6, 3))
        days = list(dr.dates())
        assert len(days) == 3
        assert days[0] == date(2025, 6, 1)
        assert days[-1] == date(2025, 6, 3)

    def test_reversed_raises(self):
        with pytest.raises(ValueError):
            DateRange(start=date(2025, 6, 5), end=date(2025, 6, 1))
