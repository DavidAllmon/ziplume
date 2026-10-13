// @vitest-environment node
import { describe, expect, it } from "vitest";

import { measure } from "@/lib/qr/capacity";

import { decodeHeaderText, scanContext, visitorHash } from "./scan-context";
import { dynamicPayload, generateSlug, isValidSlug, SLUG_ALPHABET } from "./slug";
import { readUtm, withUtm } from "./utm";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const DESKTOP_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

describe("slugs", () => {
  it("generates readable, valid endings", () => {
    for (let i = 0; i < 200; i++) {
      const slug = generateSlug();
      expect(slug).toHaveLength(6);
      expect(isValidSlug(slug)).toBe(true);
      expect([...slug].every((c) => SLUG_ALPHABET.includes(c))).toBe(true);
    }
  });

  it("validates custom endings", () => {
    expect(isValidSlug("summer-menu")).toBe(true);
    expect(isValidSlug("ab")).toBe(false);
    expect(isValidSlug("no spaces")).toBe(false);
    expect(isValidSlug("under_score")).toBe(false);
  });

  it("encodes uppercase so the QR uses compact alphanumeric mode", () => {
    const payload = dynamicPayload("Ab3X9q", "https://qr.techitdave.com");
    expect(payload).toBe("HTTPS://QR.TECHITDAVE.COM/R/AB3X9Q");
    const upper = measure(payload, "M").modules!;
    const lower = measure("https://qr.techitdave.com/r/Ab3X9q", "M").modules!;
    expect(upper).toBeLessThan(lower);
  });
});

describe("scan context", () => {
  const headers = (init: Record<string, string>) => new Headers(init);

  it("reads device, OS, browser and Cloudflare location", () => {
    const ctx = scanContext(
      headers({
        "user-agent": IPHONE,
        "cf-connecting-ip": "203.0.113.7",
        "cf-ipcountry": "us",
        "cf-region": "California",
        "cf-ipcity": "Los Angeles",
      }),
      "secret",
    );
    expect(ctx).toMatchObject({
      isBot: false,
      country: "US",
      region: "California",
      city: "Los Angeles",
      deviceType: "mobile",
      os: "iOS",
      browser: "Mobile Safari",
    });
    expect(scanContext(headers({ "user-agent": DESKTOP_CHROME }), "s").deviceType).toBe("desktop");
  });

  it("flags previews and scripts as bots and drops unknown countries", () => {
    expect(scanContext(headers({ "user-agent": "Slackbot-LinkExpanding 1.0" }), "s").isBot).toBe(
      true,
    );
    expect(scanContext(headers({ "user-agent": "WhatsApp/2.24.1 A" }), "s").isBot).toBe(true);
    expect(scanContext(headers({ "user-agent": "curl/8.5.0" }), "s").isBot).toBe(true);
    expect(scanContext(headers({}), "s").isBot).toBe(true);
    expect(
      scanContext(headers({ "user-agent": IPHONE, "cf-ipcountry": "XX" }), "s").country,
    ).toBeNull();
  });

  it("hashes visitors per day without exposing the IP", () => {
    const day1 = new Date("2026-10-13T10:00:00Z");
    const later = new Date("2026-10-13T23:00:00Z");
    const day2 = new Date("2026-10-14T01:00:00Z");
    const a = visitorHash("203.0.113.7", IPHONE, "secret", day1);
    expect(a).toHaveLength(32);
    expect(a).not.toContain("203");
    expect(visitorHash("203.0.113.7", IPHONE, "secret", later)).toBe(a);
    expect(visitorHash("203.0.113.7", IPHONE, "secret", day2)).not.toBe(a);
    expect(visitorHash("203.0.113.8", IPHONE, "secret", day1)).not.toBe(a);
  });

  it("repairs UTF-8 city names read as Latin-1", () => {
    const mangled = Buffer.from("São Paulo", "utf8").toString("latin1");
    expect(decodeHeaderText(mangled)).toBe("São Paulo");
    expect(decodeHeaderText("Zürich")).toBe("Zürich");
    expect(decodeHeaderText("  ")).toBeNull();
  });
});

describe("UTM builder", () => {
  it("adds, replaces and removes utm parameters", () => {
    const url = withUtm("https://example.com/menu?table=4&utm_source=old", {
      source: "flyer",
      medium: "qr",
      campaign: "fall-menu",
    });
    expect(url).toBe(
      "https://example.com/menu?table=4&utm_source=flyer&utm_medium=qr&utm_campaign=fall-menu",
    );
    expect(readUtm(url)).toMatchObject({ source: "flyer", medium: "qr", campaign: "fall-menu" });
    expect(withUtm(url, { source: "", medium: "", campaign: "" })).toBe(
      "https://example.com/menu?table=4",
    );
  });
});
