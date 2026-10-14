// @vitest-environment node
import { describe, expect, it } from "vitest";

import { scanTarget } from "./target";
import { isUnlocked, tooManyAttempts, unlockToken } from "./unlock";

import { measure } from "@/lib/qr/capacity";

import { decodeHeaderText, scanContext, visitorHash } from "./scan-context";
import { dynamicPayload, generateSlug, isValidSlug, PREVIEW_SLUG, SLUG_ALPHABET } from "./slug";
import { readUtm, withUtm } from "./utm";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const DESKTOP_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

describe("slugs", () => {
  it("previews use an ending nobody can claim", () => {
    expect(isValidSlug(PREVIEW_SLUG)).toBe(false);
  });

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

describe("scan targets", () => {
  const site = "https://qr.techitdave.com";
  const UID = "11111111-1111-4111-8111-111111111111";

  it("send links to their destination and pages to their page", () => {
    expect(
      scanTarget({ destination: "https://e.com", qr_type: "url", content: {} }, "ABC", null, site),
    ).toBe("https://e.com");
    expect(
      scanTarget({ destination: null, qr_type: "menu", content: {} }, "ABC234", "iOS", site),
    ).toBe(`${site}/p/ABC234`);
  });

  it("open direct PDFs straight away", () => {
    const content = {
      direct: true,
      file: { path: `${UID}/menu.pdf`, name: "menu.pdf", type: "application/pdf", size: 1 },
    };
    expect(scanTarget({ destination: null, qr_type: "pdf", content }, "PDF1", null, site)).toMatch(
      /\/storage\/v1\/object\/public\/page-media\/11111111-1111-4111-8111-111111111111\/menu\.pdf$/,
    );
    expect(
      scanTarget(
        { destination: null, qr_type: "pdf", content: { ...content, direct: false } },
        "PDF1",
        null,
        site,
      ),
    ).toBe(`${site}/p/PDF1`);
  });

  it("send phones to their app store and everyone else to the page", () => {
    const content = {
      iosUrl: "https://apps.apple.com/app/id1",
      androidUrl: "https://play.google.com/store/apps/details?id=x",
    };
    const code = { destination: null, qr_type: "app", content };
    expect(scanTarget(code, "APP", "iOS", site)).toBe("https://apps.apple.com/app/id1");
    expect(scanTarget(code, "APP", "Android", site)).toBe(
      "https://play.google.com/store/apps/details?id=x",
    );
    expect(scanTarget(code, "APP", "Windows", site)).toBe(`${site}/p/APP`);
    // An unsafe store link is ignored.
    expect(
      scanTarget({ ...code, content: { iosUrl: "javascript:alert(1)" } }, "APP", "iOS", site),
    ).toBe(`${site}/p/APP`);
  });
});

describe("unlock cookies", () => {
  const secret = "test-secret-test-secret-test-secret";

  it("unlock one slug, case-insensitively, until they expire", () => {
    const now = Date.UTC(2026, 9, 13, 12);
    const token = unlockToken("abc234", secret, now);
    expect(isUnlocked("ABC234", token, secret, now + 1000)).toBe(true);
    expect(isUnlocked("ABC235", token, secret, now)).toBe(false);
    expect(isUnlocked("ABC234", token, "other-secret", now)).toBe(false);
    expect(isUnlocked("ABC234", token, secret, now + 13 * 3600 * 1000)).toBe(false);
  });

  it("reject tampered or malformed tokens", () => {
    const now = Date.now();
    const token = unlockToken("ABC234", secret, now);
    const [expires, signature] = token.split(".");
    expect(isUnlocked("ABC234", `${Number(expires) + 9999}.${signature}`, secret, now)).toBe(false);
    expect(isUnlocked("ABC234", "garbage", secret, now)).toBe(false);
    expect(isUnlocked("ABC234", undefined, secret, now)).toBe(false);
  });

  it("limit password attempts per visitor and code", () => {
    const key = `visitor:${Math.random()}`;
    const results = Array.from({ length: 11 }, () => tooManyAttempts(key, 1_000));
    expect(results.slice(0, 10).every((r) => !r)).toBe(true);
    expect(results[10]).toBe(true);
    // The window resets after 15 minutes.
    expect(tooManyAttempts(key, 1_000 + 16 * 60 * 1000)).toBe(false);
  });
});
