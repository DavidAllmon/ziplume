import { describe, expect, it } from "vitest";

import {
  customBounds,
  parseWorkspaceAnalytics,
  countryFlag,
  countryName,
  csvField,
  dayInZone,
  fillDays,
  groupByWeek,
  niceTicks,
  parseAnalytics,
  rangeBounds,
  startOfDayInZone,
} from "./shape";

describe("analytics shaping", () => {
  it("computes range bounds", () => {
    const now = new Date("2026-10-13T12:00:00Z");
    const created = new Date("2026-01-01T00:00:00Z");
    // Seven whole days including today, starting at midnight where the viewer is.
    expect(rangeBounds("7d", now, created).from.toISOString()).toBe("2026-10-07T00:00:00.000Z");
    expect(rangeBounds("7d", now, created, "America/Chicago").from.toISOString()).toBe(
      "2026-10-07T05:00:00.000Z",
    );
    expect(rangeBounds("all", now, created).from).toBe(created);
    // A code made three days ago doesn't show a year of empty days.
    const recent = new Date("2026-10-10T15:30:00Z");
    expect(rangeBounds("12m", now, recent).from).toBe(recent);
  });

  it("finds midnight in a time zone, including across daylight saving changes", () => {
    expect(startOfDayInZone("2026-07-01", "America/Chicago").toISOString()).toBe(
      "2026-07-01T05:00:00.000Z",
    );
    expect(startOfDayInZone("2026-01-15", "America/Chicago").toISOString()).toBe(
      "2026-01-15T06:00:00.000Z",
    );
    // US clocks fall back on 2026-11-01 at 2am: midnight is still on daylight time.
    expect(startOfDayInZone("2026-11-01", "America/Chicago").toISOString()).toBe(
      "2026-11-01T05:00:00.000Z",
    );
    expect(startOfDayInZone("2026-11-02", "America/Chicago").toISOString()).toBe(
      "2026-11-02T06:00:00.000Z",
    );
    expect(startOfDayInZone("2026-10-13", "Asia/Kolkata").toISOString()).toBe(
      "2026-10-12T18:30:00.000Z",
    );
    expect(startOfDayInZone("2026-10-13", "UTC").toISOString()).toBe("2026-10-13T00:00:00.000Z");
  });

  it("fills missing days with zeros in the viewer's time zone", () => {
    const from = new Date("2026-10-10T12:00:00Z");
    const to = new Date("2026-10-13T12:01:00Z");
    const points = fillDays([{ day: "2026-10-11", scans: 4, unique: 3 }], from, to, "UTC");
    expect(points.map((p) => [p.day, p.scans])).toEqual([
      ["2026-10-10", 0],
      ["2026-10-11", 4],
      ["2026-10-12", 0],
      ["2026-10-13", 0],
    ]);
    expect(dayInZone(new Date("2026-10-13T03:00:00Z"), "America/Los_Angeles")).toBe("2026-10-12");
  });

  it("groups days into Monday-start weeks", () => {
    const weeks = groupByWeek([
      { day: "2026-10-11", scans: 1, unique: 1 }, // Sunday
      { day: "2026-10-12", scans: 2, unique: 2 }, // Monday
      { day: "2026-10-13", scans: 3, unique: 1 },
    ]);
    expect(weeks).toEqual([
      { day: "2026-10-05", scans: 1, unique: 1 },
      { day: "2026-10-12", scans: 5, unique: 3 },
    ]);
  });

  it("makes round axis ticks", () => {
    expect(niceTicks(13)).toEqual([0, 5, 10, 15]);
    expect(niceTicks(0)).toEqual([0, 1]);
    expect(niceTicks(3)).toEqual([0, 1, 2, 3]);
    expect(niceTicks(1234).at(-1)).toBeGreaterThanOrEqual(1234);
  });

  it("names countries and builds flags", () => {
    expect(countryName("US")).toBe("United States");
    expect(countryName("??")).toBe("Unknown");
    expect(countryFlag("DE")).toBe("🇩🇪");
    expect(countryFlag(null)).toBe("🌐");
  });

  it("parses analytics defensively", () => {
    expect(parseAnalytics(null).total).toBe(0);
    expect(
      parseAnalytics({ total: "5", daily: [{ day: "2026-10-01", scans: "2", unique: "1" }] }),
    ).toMatchObject({
      total: 5,
      daily: [{ day: "2026-10-01", scans: 2, unique: 1 }],
    });
  });

  it("escapes CSV fields and blocks spreadsheet formulas", () => {
    expect(csvField("São Paulo")).toBe("São Paulo");
    expect(csvField('He said "hi", ok')).toBe('"He said ""hi"", ok"');
    expect(csvField("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvField(null)).toBe("");
  });
});

describe("custom ranges", () => {
  const now = new Date("2030-03-15T12:00:00Z");

  it("are whole days in the viewer's zone, the end day included", () => {
    expect(customBounds("2030-03-01", "2030-03-02", "UTC", now)).toEqual({
      from: new Date("2030-03-01T00:00:00Z"),
      to: new Date("2030-03-03T00:00:00Z"),
    });
    // New York moves its clocks on March 10, 2030.
    expect(customBounds("2030-03-09", "2030-03-10", "America/New_York", now)).toEqual({
      from: new Date("2030-03-09T05:00:00Z"),
      to: new Date("2030-03-11T04:00:00Z"),
    });
    expect(customBounds("2030-03-05", "2030-03-05", "UTC", now)).toEqual({
      from: new Date("2030-03-05T00:00:00Z"),
      to: new Date("2030-03-06T00:00:00Z"),
    });
  });

  it("cut an end in the future to today, and refuse what isn't a range", () => {
    expect(customBounds("2030-03-14", "2030-04-01", "UTC", now)?.to).toEqual(
      new Date("2030-03-16T00:00:00Z"),
    );
    expect(customBounds("2030-03-10", "2030-03-01", "UTC", now)).toBeNull();
    expect(customBounds("2030-04-01", "2030-04-02", "UTC", now)).toBeNull();
    expect(customBounds("", "2030-03-01", "UTC", now)).toBeNull();
    expect(customBounds("2030-02-30", "2030-03-01", "UTC", now)).toBeNull();
  });
});

describe("workspace analytics data", () => {
  it("reads the totals like a code's, plus its top codes", () => {
    const data = parseWorkspaceAnalytics({
      total: 3,
      unique: 2,
      daily: [{ day: "2030-01-10", scans: 3, unique: 2 }],
      countries: [{ label: "US", scans: 3 }],
      devices: [{ label: "mobile", scans: 3 }],
      codes: [{ id: "c1", name: "Menu", owner: "u1", scans: "3", unique: 2 }, { name: "no id" }],
    });
    expect(data.total).toBe(3);
    expect(data.codes).toEqual([{ id: "c1", name: "Menu", owner: "u1", scans: 3, unique: 2 }]);
    expect(parseWorkspaceAnalytics(null)).toMatchObject({ total: 0, codes: [] });
  });
});
