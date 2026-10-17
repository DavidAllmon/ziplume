// Countdowns for coupons and events (spec items 27 and 34). Pure: the caller passes the time.

/** A YYYY-MM-DD date in the device's own time zone. */
export function localDate(at: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const dayNumber = (date: string) => {
  const [y = 2000, m = 1, d = 1] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
};

/** "January 20, 2030" from "2030-01-20". */
export function formatDay(value: string): string {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });
}

/** "Ends in 3 days" in the last week, "This offer has ended" after it; "" without a date. */
export function couponDeadlineText(validUntil: string, today: string): string {
  if (!DATE.test(validUntil) || !DATE.test(today)) return "";
  const days = dayNumber(validUntil) - dayNumber(today);
  if (days < 0) return "This offer has ended";
  if (days === 0) return "Ends today";
  if (days === 1) return "Ends tomorrow";
  if (days <= 7) return `Ends in ${days} days`;
  return `Valid until ${formatDay(validUntil)}`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** "Starts in 3 days 4 hours", "Happening now" or "This event has ended" (spec item 34). */
export function eventCountdownText(times: { start: Date; end: Date } | null, now: Date): string {
  if (!times) return "";
  if (now >= times.end) return "This event has ended";
  if (now >= times.start) return "Happening now";
  const minutes = Math.floor((times.start.getTime() - now.getTime()) / 60_000);
  if (minutes < 1) return "Starts in less than a minute";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days) return `Starts in ${plural(days, "day")}${hours ? ` ${plural(hours, "hour")}` : ""}`;
  if (hours) return `Starts in ${plural(hours, "hour")}${mins ? ` ${plural(mins, "minute")}` : ""}`;
  return `Starts in ${plural(mins, "minute")}`;
}

/** How early the join link opens (spec item 30). */
export const JOIN_EARLY = 15 * 60_000;

export const joinOpen = (times: { start: Date; end: Date } | null, now: Date) =>
  times !== null && now.getTime() >= times.start.getTime() - JOIN_EARLY && now < times.end;
