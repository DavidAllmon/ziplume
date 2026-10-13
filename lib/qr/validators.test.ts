import { describe, expect, it } from "vitest";

import {
  isValidEmail,
  isValidPhone,
  isValidUrl,
  validateContact,
  validateEmail,
  validateLocation,
  validatePayment,
  validateUrl,
  validateWhatsApp,
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

describe("new static type validation", () => {
  it("WhatsApp numbers need a country code", () => {
    expect(validateWhatsApp({ phone: "+1 555 010 9999", message: "" })).toEqual({});
    expect(validateWhatsApp({ phone: "123", message: "" }).phone).toBeTruthy();
  });

  it("coordinates stay on the planet", () => {
    expect(
      validateLocation({ mode: "coordinates", query: "", latitude: "48.85", longitude: "2.29" }),
    ).toEqual({});
    expect(
      validateLocation({ mode: "coordinates", query: "", latitude: "91", longitude: "abc" }),
    ).toMatchObject({ latitude: expect.any(String), longitude: expect.any(String) });
    expect(
      validateLocation({ mode: "address", query: "  ", latitude: "", longitude: "" }).query,
    ).toBeTruthy();
  });

  it("payment accounts and amounts match each method", () => {
    const base = { amount: "", currency: "", note: "" };
    expect(validatePayment({ ...base, method: "paypal", account: "dave" })).toEqual({});
    expect(
      validatePayment({ ...base, method: "paypal", account: "dave smith" }).account,
    ).toBeTruthy();
    expect(validatePayment({ ...base, method: "cashapp", account: "$123" }).account).toBeTruthy();
    expect(
      validatePayment({ ...base, method: "ethereum", account: "0x" + "a".repeat(40) }),
    ).toEqual({});
    expect(
      validatePayment({
        ...base,
        method: "bitcoin",
        account: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq",
        amount: "0.0001",
      }),
    ).toEqual({});
    expect(
      validatePayment({ ...base, method: "venmo", account: "dave-a", amount: "-1" }).amount,
    ).toBeTruthy();
    expect(
      validatePayment({ ...base, method: "paypal", account: "dave", amount: "1.234" }).amount,
    ).toBeTruthy();
  });
});
