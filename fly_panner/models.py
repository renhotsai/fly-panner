"""Data models for fly-panner."""

from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Optional


@dataclass(frozen=True, order=True)
class FlightSegment:
    """A single flight leg."""
    departure_airport: str
    arrival_airport: str
    departure_time: str  # ISO 8601
    arrival_time: str    # ISO 8601
    carrier: str
    flight_number: str
    duration: str        # ISO 8601 duration, e.g. "PT2H30M"

    @property
    def duration_minutes(self) -> int:
        """Parse ISO 8601 duration to total minutes."""
        import re
        match = re.match(r"PT(?:(\d+)H)?(?:(\d+)M)?", self.duration)
        if not match:
            return 0
        hours = int(match.group(1) or 0)
        minutes = int(match.group(2) or 0)
        return hours * 60 + minutes

    @property
    def duration_pretty(self) -> str:
        total = self.duration_minutes
        return f"{total // 60}h {total % 60}m"


@dataclass(frozen=True, order=True)
class FlightItinerary:
    """One direction of a journey (outbound or return), consisting of segments."""
    segments: tuple[FlightSegment, ...]

    @property
    def origin(self) -> str:
        return self.segments[0].departure_airport

    @property
    def destination(self) -> str:
        return self.segments[-1].arrival_airport

    @property
    def departure_date(self) -> str:
        return self.segments[0].departure_time[:10]

    @property
    def arrival_date(self) -> str:
        return self.segments[-1].arrival_time[:10]

    @property
    def stops(self) -> int:
        return len(self.segments) - 1

    @property
    def total_duration_minutes(self) -> int:
        return sum(s.duration_minutes for s in self.segments)

    @property
    def total_duration_pretty(self) -> str:
        total = self.total_duration_minutes
        return f"{total // 60}h {total % 60}m"

    @property
    def carriers(self) -> list[str]:
        seen: list[str] = []
        for s in self.segments:
            if s.carrier not in seen:
                seen.append(s.carrier)
        return seen


@dataclass(frozen=True, order=True)
class FlightOffer:
    """A complete flight offer with price information."""
    price: float
    currency: str
    outbound: FlightItinerary
    inbound: Optional[FlightItinerary] = None
    seats_remaining: Optional[int] = None

    @property
    def is_round_trip(self) -> bool:
        return self.inbound is not None

    @property
    def departure_date(self) -> str:
        return self.outbound.departure_date

    @property
    def return_date(self) -> Optional[str]:
        return self.inbound.departure_date if self.inbound else None

    @property
    def trip_duration_days(self) -> Optional[int]:
        if not self.inbound:
            return None
        dep = date.fromisoformat(self.outbound.departure_date)
        ret = date.fromisoformat(self.inbound.departure_date)
        return (ret - dep).days


@dataclass
class DateRange:
    """An inclusive range of dates."""
    start: date
    end: date

    def __post_init__(self) -> None:
        if self.end < self.start:
            raise ValueError(
                f"End date {self.end} must not be before start date {self.start}"
            )

    def dates(self):
        """Yield every date in the range, inclusive."""
        current = self.start
        while current <= self.end:
            yield current
            current += timedelta(days=1)

    def __len__(self) -> int:
        return (self.end - self.start).days + 1
