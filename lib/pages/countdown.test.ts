import { describe, expect, it } from "vitest";

import { couponDeadlineText, localDate } from "./countdown";

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
