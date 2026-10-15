import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isOwnOrigin,
  legacyHostAction,
  legacyHosts,
  normalizeHost,
  parseLegacyHosts,
  siteFor,
  throughSite,
} from "./hosts";

const SITE = "https://ziplume.com";
const OLD = ["qr.techitdave.com"];
const act = (host: string | null, path: string, search = "", legacy: readonly string[] = OLD) =>
  legacyHostAction(host, path, search, { siteUrl: SITE, legacyHosts: legacy });

afterEach(() => vi.unstubAllEnvs());

describe("host names", () => {
  it("compare without case, port or a trailing dot", () => {
    expect(normalizeHost("QR.TechitDave.com:443")).toBe("qr.techitdave.com");
    expect(normalizeHost("qr.techitdave.com.")).toBe("qr.techitdave.com");
    expect(normalizeHost("[::1]:3000")).toBe("[::1]");
    expect(normalizeHost(null)).toBe("");
  });

  it("are read from LEGACY_HOSTS, separated by commas or spaces, ignoring schemes and paths", () => {
    expect(parseLegacyHosts(undefined)).toEqual([]);
    expect(parseLegacyHosts("")).toEqual([]);
    expect(
      parseLegacyHosts(" qr.techitdave.com, https://Old.Example/path  old2.example:8443 "),
    ).toEqual(["qr.techitdave.com", "old.example", "old2.example"]);
  });

  it("come from the environment when a request is handled", () => {
    vi.stubEnv("LEGACY_HOSTS", "qr.techitdave.com");
    expect(legacyHosts()).toEqual(["qr.techitdave.com"]);
    vi.stubEnv("LEGACY_HOSTS", "");
    expect(legacyHosts()).toEqual([]);
  });
});

describe("the old address", () => {
  it.each([
    "/r/AB3X9Q",
    "/R/AB3X9Q",
    "/r",
    "/p/MENU12",
    "/p/MENU12/feedback",
    "/p/MENU12/contact.vcf",
    "/api/health",
    "/api/v1/codes/abc",
    "/_next/static/chunks/app.js",
    "/email-templates/recovery.html",
    "/brand/email-header.png",
    "/icons/icon-192.png",
    "/sw.js",
    "/favicon.ico",
    "/icon.svg",
    "/apple-icon.png",
    "/manifest.webmanifest",
    "/opengraph-image.png",
    "/twitter-image.png",
  ])("serves %s itself", (path) => {
    expect(act("qr.techitdave.com", path)).toBeNull();
  });

  it.each([
    ["/", "", "https://ziplume.com/"],
    ["/codes", "?folder=f1&workspace=w", "https://ziplume.com/codes?folder=f1&workspace=w"],
    ["/login", "?next=%2Fcodes", "https://ziplume.com/login?next=%2Fcodes"],
    [
      "/auth/confirm",
      "?token_hash=abc&type=recovery",
      "https://ziplume.com/auth/confirm?token_hash=abc&type=recovery",
    ],
    ["/auth/v1/callback", "?code=x&state=y", "https://ziplume.com/auth/v1/callback?code=x&state=y"],
    [
      "/storage/v1/object/public/avatars/u/a.png",
      "",
      "https://ziplume.com/storage/v1/object/public/avatars/u/a.png",
    ],
    ["/rx", "", "https://ziplume.com/rx"],
    ["/pricing", "", "https://ziplume.com/pricing"],
    ["/sw.js.map", "", "https://ziplume.com/sw.js.map"],
  ])("forwards %s%s", (path, search, location) => {
    expect(act("qr.techitdave.com", path, search)).toBe(location);
  });

  it("is matched in any case and with a port", () => {
    expect(act("QR.TECHITDAVE.COM", "/codes")).toBe("https://ziplume.com/codes");
    expect(act("qr.techitdave.com:443", "/codes")).toBe("https://ziplume.com/codes");
    expect(act("QR.TECHITDAVE.COM", "/R/AB3X9Q")).toBeNull();
  });
});

describe("other hosts", () => {
  it("leave the canonical address alone", () => {
    expect(act("ziplume.com", "/codes")).toBeNull();
    expect(act("ZIPLUME.COM:443", "/")).toBeNull();
  });

  it("send www to the canonical address, every path", () => {
    expect(act("www.ziplume.com", "/r/AB3X9Q", "?x=1")).toBe("https://ziplume.com/r/AB3X9Q?x=1");
  });

  it("never forward the health check, localhost or unknown hosts", () => {
    for (const host of ["127.0.0.1:3000", "localhost:3000", "4gko.152.44.42.29.sslip.io", null, ""])
      expect(act(host, "/codes")).toBeNull();
  });

  it("do nothing without a legacy setting", () => {
    expect(act("qr.techitdave.com", "/codes", "", [])).toBeNull();
  });

  it("never loops when the legacy list names the canonical host", () => {
    expect(act("ziplume.com", "/codes", "", ["ziplume.com"])).toBeNull();
  });
});

describe("scan targets", () => {
  it("stay on the old address when the scan came in there", () => {
    expect(siteFor("qr.techitdave.com", SITE, OLD)).toBe("https://qr.techitdave.com");
    expect(siteFor("QR.TECHITDAVE.COM:443", SITE, OLD)).toBe("https://qr.techitdave.com");
  });

  it("use the site address everywhere else", () => {
    expect(siteFor("ziplume.com", SITE, OLD)).toBe(SITE);
    expect(siteFor("127.0.0.1:3000", SITE, OLD)).toBe(SITE);
    expect(siteFor(null, SITE, OLD)).toBe(SITE);
  });
});

describe("our own pages", () => {
  it("are the site address or the host the request came to", () => {
    expect(isOwnOrigin("https://ziplume.com", "ziplume.com", SITE)).toBe(true);
    expect(isOwnOrigin("https://qr.techitdave.com", "qr.techitdave.com", SITE)).toBe(true);
    expect(isOwnOrigin("http://localhost:4173", "localhost:4173", "http://localhost:4173")).toBe(
      true,
    );
    expect(isOwnOrigin("https://ziplume.com", "127.0.0.1:3000", SITE)).toBe(true);
  });

  it("are nothing else", () => {
    expect(isOwnOrigin("https://evil.example", "qr.techitdave.com", SITE)).toBe(false);
    expect(isOwnOrigin("https://qr.techitdave.com.evil.example", "qr.techitdave.com", SITE)).toBe(
      false,
    );
    expect(isOwnOrigin("null", "qr.techitdave.com", SITE)).toBe(false);
    expect(isOwnOrigin("https://qr.techitdave.com", null, SITE)).toBe(false);
  });
});

describe("Google sign-in", () => {
  const PROJECT = "https://project.supabase.example";

  it("starts on the site address with the query exactly as supabase-js made it", () => {
    const query =
      "?provider=google&redirect_to=https%3A%2F%2Fziplume.com%2Fauth%2Fcallback%3Fnext%3D%252Fcodes&code_challenge=Ab-_9z&code_challenge_method=s256";
    expect(throughSite(`${PROJECT}/auth/v1/authorize${query}`, SITE, PROJECT)).toBe(
      `${SITE}/auth/v1/authorize${query}`,
    );
  });

  it("leaves every other address alone", () => {
    expect(throughSite("https://accounts.google.com/o/oauth2/auth?x=1", SITE, PROJECT)).toBe(
      "https://accounts.google.com/o/oauth2/auth?x=1",
    );
    expect(throughSite(`${PROJECT}/auth/v1/token?x=1`, SITE, PROJECT)).toBe(
      `${PROJECT}/auth/v1/token?x=1`,
    );
    expect(throughSite(`${PROJECT}/auth/v1/authorize?x=1`, SITE, "")).toBe(
      `${PROJECT}/auth/v1/authorize?x=1`,
    );
  });
});
