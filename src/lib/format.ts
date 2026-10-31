/**
 * Display formatting helpers.
 *
 * All operational timestamps are presented in UTC. Local-time rendering is a
 * presentation choice left to a future user preference, never an implicit
 * default in intelligence records.
 */

const TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});

const DATE_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: 'UTC',
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});

/** `20:16:04` in UTC. */
export function formatUtcTime(date: Date): string {
  return TIME_FORMATTER.format(date);
}

/** `2026-10-31` in UTC. */
export function formatUtcDate(date: Date): string {
  return DATE_FORMATTER.format(date);
}

/** `2026-10-31 20:16Z` from an ISO string; falls back to the raw value. */
export function formatUtcDateTime(isoTimestamp: string): string {
  const parsed = Date.parse(isoTimestamp);

  if (!Number.isFinite(parsed)) {
    return isoTimestamp;
  }

  return `${DATE_TIME_FORMATTER.format(new Date(parsed))}Z`;
}

/** Locale-independent integer formatting for counters and metrics. */
export function formatCount(value: number): string {
  return new Intl.NumberFormat('en-GB').format(value);
}
