// Time-zone arithmetic with Intl only (no date library).

/** How far a time zone is ahead of UTC at an instant, in milliseconds. */
export function zoneOffset(at: number, timeZone: string): number {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(at))
      .map((p) => [p.type, Number(p.value)]),
  ) as Record<string, number>;
  const wall = Date.UTC(
    parts.year!,
    parts.month! - 1,
    parts.day!,
    parts.hour! % 24,
    parts.minute!,
    parts.second!,
  );
  return wall - Math.floor(at / 1000) * 1000;
}

/** The instant a wall-clock time ("YYYY-MM-DDTHH:mm") happens in a time zone. */
export function zonedTimeToUtc(local: string, timeZone: string): Date {
  const asUtc = Date.parse(`${local.length === 10 ? `${local}T00:00` : local}:00Z`);
  if (Number.isNaN(asUtc)) return new Date(NaN);
  const guess = asUtc - zoneOffset(asUtc, timeZone);
  // A second pass corrects times near a daylight saving change.
  return new Date(asUtc - zoneOffset(guess, timeZone));
}

/** The instant a calendar day (YYYY-MM-DD) starts in a time zone. */
export const startOfDayInZone = (day: string, timeZone: string) =>
  zonedTimeToUtc(`${day}T00:00`, timeZone);

export function isTimeZone(value: string): boolean {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
