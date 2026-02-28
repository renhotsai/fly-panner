"""Tests for fly_panner.formatters."""

import csv
import io
import json
from datetime import date

import pytest

from fly_panner.formatters import print_csv, print_json, print_table
from fly_panner.models import FlightItinerary, FlightOffer, FlightSegment


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _seg(dep_airport="JFK", arr_airport="LHR", dep_time="2025-06-01T08:00:00",
         arr_time="2025-06-01T20:00:00", carrier="BA", fn="178", dur="PT12H00M"):
    return FlightSegment(
        departure_airport=dep_airport,
        arrival_airport=arr_airport,
        departure_time=dep_time,
        arrival_time=arr_time,
        carrier=carrier,
        flight_number=fn,
        duration=dur,
    )


def _one_way_offer(price=350.0) -> FlightOffer:
    return FlightOffer(
        price=price,
        currency="USD",
        outbound=FlightItinerary(segments=(_seg(),)),
    )


def _round_trip_offer(price=700.0) -> FlightOffer:
    inbound_seg = _seg(
        dep_airport="LHR", arr_airport="JFK",
        dep_time="2025-06-15T10:00:00", arr_time="2025-06-15T18:00:00",
        fn="179",
    )
    return FlightOffer(
        price=price,
        currency="USD",
        outbound=FlightItinerary(segments=(_seg(),)),
        inbound=FlightItinerary(segments=(inbound_seg,)),
    )


# ---------------------------------------------------------------------------
# JSON formatter
# ---------------------------------------------------------------------------

class TestPrintJson:
    def test_empty_list(self):
        buf = io.StringIO()
        print_json([], file=buf)
        assert json.loads(buf.getvalue()) == []

    def test_one_way_offer(self):
        buf = io.StringIO()
        print_json([_one_way_offer()], file=buf)
        data = json.loads(buf.getvalue())
        assert len(data) == 1
        assert data[0]["price"] == 350.0
        assert data[0]["currency"] == "USD"
        assert data[0]["inbound"] is None

    def test_round_trip_offer(self):
        buf = io.StringIO()
        print_json([_round_trip_offer()], file=buf)
        data = json.loads(buf.getvalue())
        assert data[0]["inbound"] is not None
        assert data[0]["return_date"] == "2025-06-15"
        assert data[0]["trip_duration_days"] == 14


# ---------------------------------------------------------------------------
# CSV formatter
# ---------------------------------------------------------------------------

class TestPrintCsv:
    def _read_csv(self, offers):
        buf = io.StringIO()
        print_csv(offers, file=buf)
        buf.seek(0)
        return list(csv.DictReader(buf))

    def test_header_present(self):
        buf = io.StringIO()
        print_csv([], file=buf)
        buf.seek(0)
        header = buf.readline().strip()
        assert "price" in header
        assert "departure_date" in header

    def test_one_way_row(self):
        rows = self._read_csv([_one_way_offer()])
        assert len(rows) == 1
        assert rows[0]["price"] == "350.0"
        assert rows[0]["return_date"] == ""

    def test_round_trip_row(self):
        rows = self._read_csv([_round_trip_offer()])
        assert rows[0]["return_date"] == "2025-06-15"
        assert rows[0]["trip_duration_days"] == "14"

    def test_rank_increments(self):
        rows = self._read_csv([_one_way_offer(100), _one_way_offer(200)])
        assert rows[0]["rank"] == "1"
        assert rows[1]["rank"] == "2"


# ---------------------------------------------------------------------------
# Table formatter (smoke test only – rich output is not easily asserted)
# ---------------------------------------------------------------------------

class TestPrintTable:
    def test_no_error_on_empty(self):
        buf = io.StringIO()
        print_table([], file=buf)  # should not raise

    def test_no_error_on_offers(self):
        buf = io.StringIO()
        print_table([_one_way_offer(), _round_trip_offer()], file=buf)
