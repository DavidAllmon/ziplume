import { describe, expect, it } from "vitest";

import { couponDeadlineText, eventCountdownText, joinOpen, localDate } from "./countdown";

describe("a coupon's countdown", () => {
  it("counts down the last week, then says it ended", () => {
    expect(couponDeadlineText("2030-01-20", "2030-01-01")).toBe("Valid until January 20, 2030");
    expect(couponDeadlineText("2030-01-08", "2030-01-01")).toBe("Ends in 7 days");
    expect(couponDeadlineText("2030-01-04", "2030-01-01")).toBe("Ends in 3 days");
    expect(couponDeadlineText("2030-01-02", "2030-01-01")).toBe("Ends tomorrow");
    expect(couponDeadlineText("2030-01-01", "2030-01-01")).toBe("Ends today");
    expect(couponDeadlineText("2029-12-31", "2030-01-01")).toBe("This offer has ended");
    expect(couponDeadlineText("", "2030-01-01")).toBe("");
    expect(couponDeadlineText("soon", "2030-01-01")).toBe("");
  });

  it("reads today in the visitor's own time zone", () => {
    expect(localDate(new Date(2030, 0, 1, 23, 59))).toBe("2030-01-01");
    expect(localDate(new Date(2030, 0, 2, 0, 0))).toBe("2030-01-02");
  });
});

describe("an event's countdown", () => {
  const times = { start: new Date("2030-01-10T18:00:00Z"), end: new Date("2030-01-10T21:00:00Z") };
  const at = (iso: string) => new Date(iso);

  it("counts down in days and hours, then hours and minutes, then minutes", () => {
    expect(eventCountdownText(times, at("2030-01-07T14:00:00Z"))).toBe("Starts in 3 days 4 hours");
    expect(eventCountdownText(times, at("2030-01-09T18:00:00Z"))).toBe("Starts in 1 day");
    expect(eventCountdownText(times, at("2030-01-10T13:50:00Z"))).toBe(
      "Starts in 4 hours 10 minutes",
    );
    expect(eventCountdownText(times, at("2030-01-10T17:00:00Z"))).toBe("Starts in 1 hour");
    expect(eventCountdownText(times, at("2030-01-10T17:35:00Z"))).toBe("Starts in 25 minutes");
    expect(eventCountdownText(times, at("2030-01-10T17:59:30Z"))).toBe(
      "Starts in less than a minute",
    );
  });

  it("says happening now from the start, and ended from the end", () => {
    expect(eventCountdownText(times, at("2030-01-10T18:00:00Z"))).toBe("Happening now");
    expect(eventCountdownText(times, at("2030-01-10T20:59:00Z"))).toBe("Happening now");
    expect(eventCountdownText(times, at("2030-01-10T21:00:00Z"))).toBe("This event has ended");
    expect(eventCountdownText(null, at("2030-01-10T21:00:00Z"))).toBe("");
  });

  it("opens the join link 15 minutes before the start, until the end", () => {
    expect(joinOpen(times, at("2030-01-10T17:44:00Z"))).toBe(false);
    expect(joinOpen(times, at("2030-01-10T17:45:00Z"))).toBe(true);
    expect(joinOpen(times, at("2030-01-10T20:59:00Z"))).toBe(true);
    expect(joinOpen(times, at("2030-01-10T21:00:00Z"))).toBe(false);
    expect(joinOpen(null, at("2030-01-10T18:00:00Z"))).toBe(false);
  });
});
