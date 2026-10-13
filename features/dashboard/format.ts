const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "3 minutes ago", "yesterday", "in 2 days"; falls back to the date for old values. */
export function relativeTime(iso: string | null, now = Date.now()): string {
  if (!iso) return "Never";
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  const abs = Math.abs(seconds);
  if (abs < 60) return "Just now";
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(seconds / 86400), "day");
  return new Date(iso).toLocaleDateString("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** relativeTime for use mid-sentence: "3 days ago", "never", "in 2 weeks", "on Oct 13, 2026". */
export function relativePhrase(iso: string | null, now = Date.now()): string {
  const text = relativeTime(iso, now);
  return /^[A-Z][a-z]+ \d/.test(text) ? `on ${text}` : text.toLowerCase();
}

export const formatCount = (n: number) => new Intl.NumberFormat("en").format(n);
