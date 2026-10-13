// Pure helpers that turn code_analytics() output into what the analytics page draws.

export type RangeKey = "7d" | "30d" | "90d" | "12m" | "all";

export const RANGES: readonly { value: RangeKey; label: string; days: number | null }[] = [
  { value: "7d", label: "7 days", days: 7 },
  { value: "30d", label: "30 days", days: 30 },
  { value: "90d", label: "90 days", days: 90 },
  { value: "12m", label: "12 months", days: 365 },
  { value: "all", label: "All time", days: null },
];

export interface Breakdown {
  label: string;
  scans: number;
  country?: string | null;
}

export interface DayPoint {
  day: string; // YYYY-MM-DD in the viewer's time zone
  scans: number;
  unique: number;
}

export interface AnalyticsData {
  total: number;
  unique: number;
  daily: DayPoint[];
  hours: { hour: number; scans: number }[];
  countries: Breakdown[];
  cities: Breakdown[];
  devices: Breakdown[];
  os: Breakdown[];
  browsers: Breakdown[];
}

export const EMPTY_ANALYTICS: AnalyticsData = {
  total: 0,
  unique: 0,
  daily: [],
  hours: [],
  countries: [],
  cities: [],
  devices: [],
  os: [],
  browsers: [],
};

/** Calendar date (YYYY-MM-DD) of an instant in a time zone. */
export function dayInZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** How far a time zone is ahead of UTC at an instant, in milliseconds. */
function zoneOffset(at: number, timeZone: string): number {
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

/** The instant a calendar day (YYYY-MM-DD) starts in a time zone. */
export function startOfDayInZone(day: string, timeZone: string): Date {
  const utcMidnight = Date.parse(`${day}T00:00:00Z`);
  const guess = utcMidnight - zoneOffset(utcMidnight, timeZone);
  // A second pass corrects days where the offset changes (daylight saving).
  return new Date(utcMidnight - zoneOffset(guess, timeZone));
}

/**
 * [from, to) for a range: whole calendar days in the viewer's time zone, ending today, and
 * never earlier than the code's creation ("all" starts there).
 */
export function rangeBounds(
  range: RangeKey,
  now: Date,
  createdAt: Date,
  timeZone = "UTC",
): { from: Date; to: Date } {
  const days = RANGES.find((r) => r.value === range)?.days ?? null;
  const to = new Date(now.getTime() + 60_000);
  if (days === null) return { from: createdAt, to };
  const firstDay = dayInZone(new Date(now.getTime() - (days - 1) * 86_400_000), timeZone);
  const from = startOfDayInZone(firstDay, timeZone);
  return { from: from < createdAt ? createdAt : from, to };
}

const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** One point per calendar day from `from` to `to`, with zero for days without scans. */
export function fillDays(daily: DayPoint[], from: Date, to: Date, timeZone: string): DayPoint[] {
  const byDay = new Map(daily.map((d) => [d.day, d]));
  const last = dayInZone(new Date(to.getTime() - 60_000), timeZone);
  const points: DayPoint[] = [];
  for (
    let day = dayInZone(from, timeZone);
    day <= last && points.length < 3700;
    day = addDays(day, 1)
  ) {
    points.push(byDay.get(day) ?? { day, scans: 0, unique: 0 });
  }
  return points;
}

/** Long ranges read better as weeks; groups days into Monday-start weeks. */
export function groupByWeek(points: DayPoint[]): DayPoint[] {
  const weeks = new Map<string, DayPoint>();
  for (const point of points) {
    const d = new Date(`${point.day}T12:00:00Z`);
    const monday = addDays(point.day, -((d.getUTCDay() + 6) % 7));
    const week = weeks.get(monday) ?? { day: monday, scans: 0, unique: 0 };
    week.scans += point.scans;
    // Unique visitors are counted per day, so weekly unique is an upper bound; label it as such.
    week.unique += point.unique;
    weeks.set(monday, week);
  }
  return [...weeks.values()];
}

/** A round axis maximum and evenly spaced ticks, e.g. 0, 5, 10, 15 for a max of 13. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0, 1];
  const rough = max / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}

const regionNames =
  typeof Intl.DisplayNames === "function"
    ? new Intl.DisplayNames(["en"], { type: "region" })
    : null;

export function countryName(code: string | null | undefined): string {
  if (!code || code === "??") return "Unknown";
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

/** Regional-indicator flag emoji for an ISO country code ("US" → 🇺🇸). */
export function countryFlag(code: string | null | undefined): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function parseAnalytics(raw: unknown): AnalyticsData {
  if (!raw || typeof raw !== "object") return EMPTY_ANALYTICS;
  const r = raw as Partial<AnalyticsData>;
  return {
    total: Number(r.total ?? 0),
    unique: Number(r.unique ?? 0),
    daily: Array.isArray(r.daily)
      ? r.daily.map((d) => ({
          day: String(d.day),
          scans: Number(d.scans),
          unique: Number(d.unique),
        }))
      : [],
    hours: Array.isArray(r.hours)
      ? r.hours.map((h) => ({ hour: Number(h.hour), scans: Number(h.scans) }))
      : [],
    countries: Array.isArray(r.countries) ? r.countries : [],
    cities: Array.isArray(r.cities) ? r.cities : [],
    devices: Array.isArray(r.devices) ? r.devices : [],
    os: Array.isArray(r.os) ? r.os : [],
    browsers: Array.isArray(r.browsers) ? r.browsers : [],
  };
}

/** Quotes a CSV field when needed (RFC 4180) and neutralizes spreadsheet formulas. */
export function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
