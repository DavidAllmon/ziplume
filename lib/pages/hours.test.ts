import { describe, expect, it } from "vitest";

import { formatTime, openStatus, statusText, zonedNow, type ZonedNow } from "./hours";
import type { DayHours } from "./types";

const day = (open: boolean, from = "09:00", to = "17:00", from2 = "", to2 = ""): DayHours => ({
  open,
  from,
  to,
  from2,
  to2,
});
// Monday–Friday 9–12 and 13–17; closed weekends.
const week = [0, 1, 2, 3, 4].map(() => day(true, "09:00", "12:00", "13:00", "17:00"));
week.push(day(false), day(false));
// Monday 2030-01-07 is day 0.
const at = (
  day: number,
  hhmm: string,
  date = `2030-01-${String(7 + day).padStart(2, "0")}`,
): ZonedNow => {
  const [h, m] = hhmm.split(":").map(Number);
  return { day, minutes: h! * 60 + m!, date };
};
const say = (now: ZonedNow, closures = [] as { date: string; note: string }[], hours = week) =>
  statusText(openStatus(hours, closures, now));

describe("Open now", () => {
  it("says open, closes soon, and between a split day's two ranges", () => {
    expect(say(at(0, "09:00"))).toBe("Open now · closes 12:00 PM");
    expect(say(at(0, "11:40"))).toBe("Closes soon · 12:00 PM");
    expect(say(at(0, "12:00"))).toBe("Closed · opens 1:00 PM");
    expect(say(at(0, "16:59"))).toBe("Closes soon · 5:00 PM");
  });

  it("says when it opens next: later today, tomorrow, or on a weekday", () => {
    expect(say(at(0, "08:59"))).toBe("Closed · opens 9:00 AM");
    expect(say(at(0, "17:00"))).toBe("Closed · opens 9:00 AM tomorrow");
    expect(say(at(4, "18:00"))).toBe("Closed · opens 9:00 AM Monday");
    expect(say(at(5, "10:00"))).toBe("Closed · opens 9:00 AM Monday");
  });

  it("says closed today on a closure date, and skips a closed tomorrow", () => {
    expect(say(at(0, "10:00"), [{ date: "2030-01-07", note: "Staff day" }])).toBe(
      "Closed today · Staff day",
    );
    expect(say(at(0, "18:00"), [{ date: "2030-01-08", note: "" }])).toBe(
      "Closed · opens 9:00 AM Wednesday",
    );
  });

  it("says nothing for a place that's never open", () => {
    expect(
      openStatus(
        [0, 1, 2, 3, 4, 5, 6].map(() => day(false)),
        [],
        at(0, "10:00"),
      ),
    ).toBeNull();
  });

  it("reads the time in the business's zone, and the visitor's when it has none or a bad one", () => {
    const moment = new Date("2030-01-07T15:30:00Z"); // a Monday
    expect(zonedNow(moment, "America/New_York")).toEqual({
      day: 0,
      minutes: 10 * 60 + 30,
      date: "2030-01-07",
    });
    expect(zonedNow(moment, "Asia/Tokyo")).toEqual({ day: 1, minutes: 30, date: "2030-01-08" });
    expect(() => zonedNow(moment, "Not/AZone")).not.toThrow();
    expect(() => zonedNow(moment, "")).not.toThrow();
  });

  it("writes times the way the page does", () => {
    expect(formatTime("09:00")).toBe("9:00 AM");
    expect(formatTime("17:30")).toBe("5:30 PM");
    expect(formatTime("00:15")).toBe("12:15 AM");
    expect(formatTime("12:00")).toBe("12:00 PM");
  });
});
