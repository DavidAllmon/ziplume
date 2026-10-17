import { isTimeZone } from "@/lib/time/zone";

import type { Closure, DayHours } from "./types";

// Opening hours and "Open now" (spec items 16 and 17). Worked out in the visitor's browser, so
// these are pure: the caller passes the time.

export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * "9:00 AM" from "09:00". Written by hand: Intl puts a narrow no-break space before AM/PM, and
 * the server's and the phone's versions of it can differ.
 */
export function formatTime(value: string): string {
  const [h = 0, m = 0] = value.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export interface ZonedNow {
  /** 0 = Monday. */
  day: number;
  minutes: number;
  /** YYYY-MM-DD */
  date: string;
}

/** The weekday, minute of the day and date in a time zone; the device's own when it has none. */
export function zonedNow(at: Date, timeZone: string): ZonedNow {
  const zone = timeZone && isTimeZone(timeZone) ? timeZone : undefined;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    day: SHORT.indexOf(get("weekday")),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
    date: `${get("year")}-${get("month")}-${get("day")}`,
  };
}

const minutes = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** A day's ranges, in order: the first, and a second when both its times are set. */
export const rangesOf = (h: DayHours | undefined): [string, string][] =>
  !h?.open
    ? []
    : [[h.from, h.to], ...(h.from2 && h.to2 ? [[h.from2, h.to2] as [string, string]] : [])];

const addDays = (date: string, days: number) => {
  const [y = 2000, m = 1, d = 1] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

export type OpenState =
  | { kind: "open"; closes: string; soon: boolean }
  | { kind: "closed"; opens: string; when: "today" | "tomorrow" | (string & {}) }
  | { kind: "closure"; note: string };

/** Open now, or when it opens next (spec item 16); null for a place that's never open. */
export function openStatus(
  hours: DayHours[],
  closures: Closure[],
  now: ZonedNow,
): OpenState | null {
  const closed = (date: string) => closures.find((c) => c.date === date);
  const today = closed(now.date);
  if (today) return { kind: "closure", note: today.note.trim() };
  const ranges = rangesOf(hours[now.day]);
  for (const [from, to] of ranges) {
    if (now.minutes >= minutes(from) && now.minutes < minutes(to)) {
      return { kind: "open", closes: to, soon: minutes(to) - now.minutes <= 30 };
    }
  }
  const later = ranges.find(([from]) => minutes(from) > now.minutes);
  if (later) return { kind: "closed", opens: later[0], when: "today" };
  for (let ahead = 1; ahead <= 7; ahead++) {
    const day = (now.day + ahead) % 7;
    if (closed(addDays(now.date, ahead))) continue;
    const first = rangesOf(hours[day])[0];
    if (first) {
      return { kind: "closed", opens: first[0], when: ahead === 1 ? "tomorrow" : DAY_NAMES[day]! };
    }
  }
  return null;
}

export function statusText(state: OpenState | null): string {
  if (!state) return "";
  if (state.kind === "closure") return state.note ? `Closed today · ${state.note}` : "Closed today";
  if (state.kind === "open") {
    return state.soon
      ? `Closes soon · ${formatTime(state.closes)}`
      : `Open now · closes ${formatTime(state.closes)}`;
  }
  const when = state.when === "today" ? "" : ` ${state.when}`;
  return `Closed · opens ${formatTime(state.opens)}${when}`;
}
