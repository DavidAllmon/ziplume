import { describe, expect, it } from "vitest";

import {
  isValidEmail,
  isValidPhone,
  isValidUrl,
  validateContact,
  validateEmail,
  validateUrl,
  validateWifi,
} from "./validators";

describe("format checks", () => {
  it.each(["example.com", "https://sub.example.co.uk/a?b=c", "localhost:3000", "mailto:a@b.co"])(
    "accepts URL %s",
    (url) => expect(isValidUrl(url)).toBe(true),
  );

  it.each(["", "not a url", "http://", "example"])("rejects URL %s", (url) =>
    expect(isValidUrl(url)).toBe(false),
  );

  it("checks emails and phones", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("a@b")).toBe(false);
    expect(isValidPhone("+1 (555) 010-9999")).toBe(true);
    expect(isValidPhone("12")).toBe(false);
  });
});

describe("validators", () => {
  it("reports missing and malformed URLs", () => {
    expect(validateUrl({ url: "" }).url).toBeDefined();
    expect(validateUrl({ url: "nope" }).url).toMatch(/web address/);
    expect(validateUrl({ url: "example.com" })).toEqual({});
  });

  it("requires a Wi-Fi password unless the network is open", () => {
    expect(validateWifi({ ssid: "", password: "", security: "WPA", hidden: false })).toHaveProperty(
      "ssid",
    );
    expect(
      validateWifi({ ssid: "Home", password: "", security: "WPA", hidden: false }),
    ).toHaveProperty("password");
    expect(
      validateWifi({ ssid: "Home", password: "short", security: "WPA", hidden: false }),
    ).toHaveProperty("password");
    expect(validateWifi({ ssid: "Home", password: "", security: "nopass", hidden: false })).toEqual(
      {},
    );
  });

  it("needs at least one contact field and checks formats", () => {
    const empty = {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      company: "",
      title: "",
      website: "",
    };
    expect(validateContact(empty)).toHaveProperty("firstName");
    expect(validateContact({ ...empty, firstName: "Ada" })).toEqual({});
    expect(validateContact({ ...empty, firstName: "Ada", email: "bad" })).toHaveProperty("email");
  });

  it("validates email recipients", () => {
    expect(validateEmail({ to: "x", subject: "", body: "" })).toHaveProperty("to");
    expect(validateEmail({ to: "x@y.io", subject: "", body: "" })).toEqual({});
  });
});
