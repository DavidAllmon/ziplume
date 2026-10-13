import { describe, expect, it } from "vitest";

import {
  encodeContact,
  encodeEmail,
  encodeLocation,
  encodePayment,
  encodePhone,
  encodeSms,
  encodeText,
  encodeUrl,
  encodeWhatsApp,
  encodeWifi,
  toBaseUnits,
} from "./encoders";
import { escapeVCard, escapeWifi } from "./escape";
import { normalizePhone, normalizeUrl } from "./normalize";
import { roundTrip } from "./test-utils";

const contact = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  company: "",
  title: "",
  website: "",
};

describe("escaping", () => {
  it("escapes Wi-Fi special characters", () => {
    expect(escapeWifi(`a\\b;c,d:e"f`)).toBe(`a\\\\b\\;c\\,d\\:e\\"f`);
  });

  it("escapes vCard text values", () => {
    expect(escapeVCard("Smith, Jones; Co\\\nLine 2")).toBe("Smith\\, Jones\\; Co\\\\\\nLine 2");
  });
});

describe("normalizeUrl", () => {
  it.each([
    ["example.com", "https://example.com"],
    ["  example.com/path?q=1 ", "https://example.com/path?q=1"],
    ["http://example.com", "http://example.com"],
    ["localhost:3000", "https://localhost:3000"],
    ["mailto:hi@example.com", "mailto:hi@example.com"],
    ["", ""],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeUrl(input)).toBe(expected);
  });
});

describe("normalizePhone", () => {
  it("keeps the leading plus and digits", () => {
    expect(normalizePhone("+1 (555) 010-9999")).toBe("+15550109999");
    expect(normalizePhone("555.010.9999")).toBe("5550109999");
    expect(normalizePhone("abc")).toBe("");
  });
});

describe("encodeUrl / encodeText", () => {
  it("normalizes URLs and returns empty for blank input", () => {
    expect(encodeUrl({ url: "example.com" })).toBe("https://example.com");
    expect(encodeUrl({ url: "   " })).toBe("");
  });

  it("keeps text verbatim but treats whitespace-only as empty", () => {
    expect(encodeText({ text: "  hello\nworld " })).toBe("  hello\nworld ");
    expect(encodeText({ text: " \n " })).toBe("");
  });
});

describe("encodeWifi", () => {
  const base = { ssid: "HomeNet", password: "hunter22", security: "WPA" as const, hidden: false };

  it("builds a WPA payload", () => {
    expect(encodeWifi(base)).toBe("WIFI:T:WPA;S:HomeNet;P:hunter22;;");
  });

  it("escapes special characters in SSID and password", () => {
    expect(encodeWifi({ ...base, ssid: 'Cafe;"Free"', password: "a:b,c\\d" })).toBe(
      'WIFI:T:WPA;S:Cafe\\;\\"Free\\";P:a\\:b\\,c\\\\d;;',
    );
  });

  it("omits the password for open networks and flags hidden ones", () => {
    expect(encodeWifi({ ...base, security: "nopass", hidden: true })).toBe(
      "WIFI:T:nopass;S:HomeNet;H:true;;",
    );
  });

  it("returns empty without an SSID", () => {
    expect(encodeWifi({ ...base, ssid: "" })).toBe("");
  });
});

describe("encodeContact", () => {
  it("returns empty when nothing is filled in", () => {
    expect(encodeContact(contact)).toBe("");
  });

  it("emits N, FN and only filled fields with CRLF line endings", () => {
    const vcard = encodeContact({
      ...contact,
      firstName: "Ada",
      lastName: "Lovelace",
      phone: "+44 20 7946 0958",
      website: "ada.dev",
    });
    expect(vcard).toBe(
      [
        "BEGIN:VCARD",
        "VERSION:3.0",
        "N:Lovelace;Ada;;;",
        "FN:Ada Lovelace",
        "TEL;TYPE=CELL:+442079460958",
        "URL:https://ada.dev",
        "END:VCARD",
      ].join("\r\n"),
    );
    expect(vcard).not.toContain("EMAIL");
    expect(vcard).not.toContain("ORG");
  });

  it("escapes values and falls back to the company for the display name", () => {
    const vcard = encodeContact({ ...contact, company: "Smith, Jones; Co" });
    expect(vcard).toContain("FN:Smith\\, Jones\\; Co");
    expect(vcard).toContain("ORG:Smith\\, Jones\\; Co");
  });
});

describe("encodeEmail / encodePhone / encodeSms", () => {
  it("builds mailto links with encoded subject and body", () => {
    expect(encodeEmail({ to: "hi@example.com", subject: "", body: "" })).toBe(
      "mailto:hi@example.com",
    );
    expect(encodeEmail({ to: "hi@example.com", subject: "Hi & bye", body: "Line 1\nLine 2" })).toBe(
      "mailto:hi@example.com?subject=Hi%20%26%20bye&body=Line%201%0ALine%202",
    );
  });

  it("builds tel and SMSTO payloads", () => {
    expect(encodePhone({ phone: "+1 555 010 9999" })).toBe("tel:+15550109999");
    expect(encodePhone({ phone: "" })).toBe("");
    expect(encodeSms({ phone: "555-0100", message: "On my way: 5 min" })).toBe(
      "SMSTO:5550100:On my way: 5 min",
    );
  });
});

describe("rendered codes decode back to the exact payload", () => {
  it.each([
    "https://example.com/path?query=1",
    "José Müller — café ☕ 東京 🎉",
    encodeWifi({ ssid: "Café 🎉", password: "p@ss;word", security: "WPA", hidden: false }),
    encodeContact({ ...contact, firstName: "Zoë", lastName: "Ångström", company: "Ünïcode, Inc." }),
    "1234567890",
  ])("%s", (payload) => {
    expect(roundTrip(payload)).toBe(payload);
  });
});

describe("new static types", () => {
  it("WhatsApp: wa.me with digits only and an encoded message", () => {
    expect(encodeWhatsApp({ phone: "+1 (555) 010-9999", message: "Hi there & hello" })).toBe(
      "https://wa.me/15550109999?text=Hi%20there%20%26%20hello",
    );
    expect(encodeWhatsApp({ phone: "", message: "x" })).toBe("");
  });

  it("location: a Google Maps search for an address or coordinates", () => {
    expect(
      encodeLocation({
        mode: "address",
        query: "Eiffel Tower, Paris",
        latitude: "",
        longitude: "",
      }),
    ).toBe("https://www.google.com/maps/search/?api=1&query=Eiffel%20Tower%2C%20Paris");
    expect(
      encodeLocation({ mode: "coordinates", query: "", latitude: "48.8584", longitude: "2.2945" }),
    ).toBe("https://www.google.com/maps/search/?api=1&query=48.8584%2C2.2945");
    expect(encodeLocation({ mode: "coordinates", query: "x", latitude: "", longitude: "1" })).toBe(
      "",
    );
  });

  it("payments: PayPal, Venmo, Cash App, Bitcoin (BIP 21) and Ethereum (EIP-681)", () => {
    const base = { amount: "", currency: "", note: "" };
    expect(
      encodePayment({
        ...base,
        method: "paypal",
        account: "@dave",
        amount: "12.50",
        currency: "USD",
      }),
    ).toBe("https://paypal.me/dave/12.50USD");
    expect(
      encodePayment({ ...base, method: "venmo", account: "dave-a", amount: "5", note: "Coffee" }),
    ).toBe("https://venmo.com/dave-a?txn=pay&amount=5&note=Coffee");
    expect(encodePayment({ ...base, method: "cashapp", account: "$dave" })).toBe(
      "https://cash.app/$dave",
    );
    expect(
      encodePayment({
        ...base,
        method: "bitcoin",
        account: "bc1qxyz",
        amount: "0.001",
        note: "Tip jar",
      }),
    ).toBe("bitcoin:bc1qxyz?amount=0.001&message=Tip%20jar");
    expect(encodePayment({ ...base, method: "ethereum", account: "0xabc", amount: "0.05" })).toBe(
      "ethereum:0xabc?value=50000000000000000",
    );
    expect(toBaseUnits("1", 18)).toBe("1000000000000000000");
    expect(toBaseUnits("0.000000000000000001", 18)).toBe("1");
  });
});
