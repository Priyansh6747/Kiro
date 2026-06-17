/**
 * Shared utilities — timestamps, timezone helpers, ID generation.
 */

/** Unix timestamp in **seconds** (integer). */
export function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

/** Unix timestamp in **milliseconds**. */
export function nowMs(): number {
  return Date.now();
}

/**
 * Returns the unix **day** integer for "today" in the given IANA timezone.
 *
 * A unix day integer = Math.floor(epoch_ms / 86_400_000) for the UTC midnight
 * that corresponds to the start of the local date in `timezone`.
 *
 * Example: if it is 2026-06-17 in Asia/Kolkata, this returns
 *   Math.floor(Date.UTC(2026, 5, 17) / 86_400_000)
 */
export function todayUnixDay(timezone = "UTC"): number {
  return localDateToUnixDay(new Date(), timezone);
}

/**
 * Converts an arbitrary `Date` to the unix day integer for the local date
 * in `timezone`.
 */
export function localDateToUnixDay(date: Date, timezone = "UTC"): number {
  // Format as YYYY-MM-DD in the target timezone.
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year  = Number(parts.find((p) => p.type === "year")!.value);
  const month = Number(parts.find((p) => p.type === "month")!.value) - 1;
  const day   = Number(parts.find((p) => p.type === "day")!.value);

  return Math.floor(Date.UTC(year, month, day) / 86_400_000);
}

/**
 * Validates an IANA timezone string.
 * Returns `true` if the timezone is valid.
 */
export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Validates HH:MM format (00:00 – 23:59). */
export function isValidHHMM(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
