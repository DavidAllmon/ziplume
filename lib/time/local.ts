// The datetime-local box speaks the viewer's own clock; pages store exact moments (ISO, UTC).

/** An ISO time as a datetime-local value in this browser's time zone; "" for none. */
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** A datetime-local value (the viewer's time zone) as an ISO time, or null when empty. */
export const localToIso = (value: string): string | null =>
  value ? new Date(value).toISOString() : null;
