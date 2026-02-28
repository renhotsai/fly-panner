/** Generate all dates (as YYYY-MM-DD strings) between start and end, inclusive. */
export function* dateRange(start: string, end: string): Generator<string> {
  const startDate = new Date(start + "T00:00:00Z");
  const endDate = new Date(end + "T00:00:00Z");
  const current = new Date(startDate);
  while (current <= endDate) {
    yield current.toISOString().slice(0, 10);
    current.setUTCDate(current.getUTCDate() + 1);
  }
}

/** Count the number of dates in an inclusive range. */
export function rangeLength(start: string, end: string): number {
  const a = new Date(start + "T00:00:00Z");
  const b = new Date(end + "T00:00:00Z");
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1);
}
