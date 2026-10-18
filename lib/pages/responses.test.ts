import { describe, expect, it } from "vitest";

import { guestChoices, rsvpCapacity, rsvpErrors, shareErrors } from "./responses";

const share = { name: "Ana", phone: "", email: "ana@example.com", note: "" };
const rsvp = { name: "Ana", email: "ana@example.com", guests: 2, note: "" };

describe("Share your details", () => {
  it("needs a name, and a phone or an email that work", () => {
    expect(shareErrors(share)).toEqual({});
    expect(shareErrors({ ...share, email: "", phone: "+1 555 0100" })).toEqual({});
    expect(shareErrors({ name: " ", phone: "", email: "", note: "" })).toEqual({
      name: "Add your name",
      phone: "Add a phone number or an email",
    });
    expect(shareErrors({ ...share, phone: "ab" }).phone).toBe("Check the phone number");
    expect(shareErrors({ ...share, email: "ana@" }).email).toBe("Check the email address");
  });

  it("says how much to shorten a note over 500 characters", () => {
    expect(shareErrors({ ...share, note: "x".repeat(501) }).note).toBe("Shorten by 1 character");
    expect(shareErrors({ ...share, note: "x".repeat(500) })).toEqual({});
  });
});

describe("RSVP", () => {
  it("needs a name, an email and 1 to 10 guests", () => {
    expect(rsvpErrors(rsvp, null)).toEqual({});
    expect(rsvpErrors({ name: "", email: "", guests: 1, note: "" }, null)).toEqual({
      name: "Add your name",
      email: "Add your email",
    });
    expect(rsvpErrors({ ...rsvp, email: "nope" }, null).email).toBe("Check the email address");
    for (const guests of [0, 11, 2.5, Number.NaN]) {
      expect(rsvpErrors({ ...rsvp, guests }, null).guests, String(guests)).toBe(
        "Pick how many are coming",
      );
    }
  });

  it("offers only the places left", () => {
    expect(guestChoices(null)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(guestChoices(3)).toEqual([1, 2, 3]);
    expect(guestChoices(0)).toEqual([]);
    expect(rsvpErrors({ ...rsvp, guests: 3 }, 2).guests).toBe("Pick how many are coming");
  });

  it("reads the places as a whole number, or no limit", () => {
    expect(rsvpCapacity("50")).toBe(50);
    expect(rsvpCapacity(" 50 ")).toBe(50);
    for (const value of ["", "0", "lots", "100000", "2.5", undefined]) {
      expect(rsvpCapacity(value), String(value)).toBeNull();
    }
  });
});
