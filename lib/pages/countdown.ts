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
