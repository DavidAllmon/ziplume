import { describe, expect, it } from "vitest";

import { PAGE_TYPE_IDS } from "@/lib/qr/types";

import { contactVcard, eventIcs, eventTimes, googleCalendarUrl } from "./files";
import { mediaPaths, sanitizeMedia, sanitizePage } from "./sanitize";
import { PAGE_DEFAULTS, type EventPage, type VcardPage } from "./types";
import { safeHref, socialHref, videoEmbed } from "./urls";
import { pageSummary, validatePage } from "./validate";

const UID = "11111111-1111-4111-8111-111111111111";
const media = (name = "a.png") => ({ path: `${UID}/${name}`, name, type: "image/png", size: 10 });

describe("sanitizePage", () => {
  it("keeps a saved page's color", () => {
    const page = sanitizePage("links", { color: "#4F46E5", title: "Cafe" });
    expect(page.color).toBe("#4F46E5");
  });

  it("returns the defaults for garbage", () => {
    for (const type of PAGE_TYPE_IDS) {
      expect(sanitizePage(type, null), type).toEqual(PAGE_DEFAULTS[type]());
      expect(sanitizePage(type, "nope"), type).toEqual(PAGE_DEFAULTS[type]());
    }
  });

  it("drops unknown keys, trims long strings and caps lists", () => {
    const page = sanitizePage("links", {
      title: "x".repeat(500),
      evil: "<script>",
      color: "not a color",
      links: Array.from({ length: 50 }, (_, i) => ({
        label: `L${i}`,
        url: "https://e.com",
        extra: 1,
      })),
      socials: [{ network: "myspace", url: "https://myspace.com/x" }],
    });
    expect(page.title).toHaveLength(120);
    expect(page).not.toHaveProperty("evil");
    expect(page.color).toBe("#0A1330");
    expect(page.links).toHaveLength(30);
    expect(page.links[0]).toEqual({ label: "L0", url: "https://e.com", on: true });
    expect(page.socials[0]?.network).toBe("instagram");
  });

  it("only accepts media in the owner's folder with safe file names", () => {
    expect(sanitizeMedia(media())).toEqual(media());
    expect(sanitizeMedia({ path: "../etc/passwd" })).toBeNull();
    expect(sanitizeMedia({ path: `${UID}/../../x.png` })).toBeNull();
    expect(sanitizeMedia({ path: "https://evil.example/x.png" })).toBeNull();
    const gallery = sanitizePage("images", {
      images: [media("1.png"), { path: "bad" }, media("2.png")],
    });
    expect(gallery.images.map((m) => m.name)).toEqual(["1.png", "2.png"]);
  });

  it("repairs opening hours", () => {
    const page = sanitizePage("business", { hours: [{ open: false, from: "25:00", to: "18:30" }] });
    expect(page.hours).toHaveLength(7);
    expect(page.hours[0]).toEqual({ open: false, from: "09:00", to: "18:30" });
  });

  it("lists every file a page uses", () => {
    const page = {
      avatar: media("me.png"),
      links: [],
      nested: { images: [media("1.png"), media("me.png")] },
    };
    expect(mediaPaths(page).sort()).toEqual([`${UID}/1.png`, `${UID}/me.png`]);
  });
});

describe("links on public pages", () => {
  it("allow only http(s), plus mail and phone when asked", () => {
    expect(safeHref("example.com/menu")).toBe("https://example.com/menu");
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("JaVaScRiPt:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,hi")).toBeNull();
    expect(safeHref("mailto:a@b.co")).toBeNull();
    expect(safeHref("mailto:a@b.co", { allowContact: true })).toBe("mailto:a@b.co");
    expect(safeHref("not a url")).toBeNull();
  });

  it("build profile links from handles", () => {
    expect(socialHref("instagram", "@quickqreate")).toBe("https://instagram.com/quickqreate");
    expect(socialHref("tiktok", "dave")).toBe("https://www.tiktok.com/@dave");
    expect(socialHref("bluesky", "@dave.bsky.social")).toBe(
      "https://bsky.app/profile/dave.bsky.social",
    );
    expect(socialHref("x", "https://x.com/dave")).toBe("https://x.com/dave");
    expect(socialHref("whatsapp", "+1 555 010 9999")).toBe("https://wa.me/15550109999");
    expect(socialHref("website", "javascript:alert(1)")).toBeNull();
  });

  it("embed YouTube and Vimeo without tracking", () => {
    expect(videoEmbed("https://youtu.be/dQw4w9WgXcQ")?.src).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
    expect(videoEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1")?.id).toBe("dQw4w9WgXcQ");
    expect(videoEmbed("https://youtube.com/shorts/dQw4w9WgXcQ")?.id).toBe("dQw4w9WgXcQ");
    expect(videoEmbed("https://vimeo.com/76979871")?.src).toBe(
      "https://player.vimeo.com/video/76979871?dnt=1",
    );
    expect(videoEmbed("https://evil.example/embed/dQw4w9WgXcQ")).toBeNull();
    expect(videoEmbed("https://youtube.com/watch?v=<script>")).toBeNull();
  });
});

describe("validatePage", () => {
  it("asks for what each page needs", () => {
    expect(validatePage("links", PAGE_DEFAULTS.links())).toMatchObject({
      title: expect.any(String),
    });
    expect(validatePage("pdf", PAGE_DEFAULTS.pdf())).toEqual({ file: "Upload a PDF" });
    expect(validatePage("pdf", { ...PAGE_DEFAULTS.pdf(), file: media("a.pdf") })).toEqual({});
    expect(
      validatePage("app", {
        ...PAGE_DEFAULTS.app(),
        name: "App",
        androidUrl: "play.google.com/store/apps/details?id=x",
      }),
    ).toEqual({});
  });

  it("flags unsafe or broken links by field", () => {
    const page = {
      ...PAGE_DEFAULTS.links(),
      title: "Me",
      links: [
        { label: "Bad", url: "javascript:alert(1)", on: true },
        { label: "Good", url: "example.com", on: true },
      ],
    };
    expect(validatePage("links", page)).toEqual({
      "links.0.url": "Enter a web address, like example.com",
    });
  });

  it("checks event times", () => {
    const base = { ...PAGE_DEFAULTS.event(), title: "Launch", timeZone: "America/Chicago" };
    expect(validatePage("event", { ...base, start: "2026-11-01T18:00" })).toEqual({});
    expect(
      validatePage("event", { ...base, start: "2026-11-01T18:00", end: "2026-11-01T17:00" }),
    ).toEqual({ end: "The end must be after the start" });
    expect(validatePage("event", { ...base, start: "", timeZone: "Mars/Base" })).toMatchObject({
      start: expect.any(String),
      timeZone: expect.any(String),
    });
  });

  it("summarizes pages", () => {
    expect(
      pageSummary("vcard", { ...PAGE_DEFAULTS.vcard(), firstName: "Ada", lastName: "Lovelace" }),
    ).toBe("Ada Lovelace");
    expect(
      pageSummary("coupon", { ...PAGE_DEFAULTS.coupon(), offer: "20% off", business: "Café" }),
    ).toBe("20% off · Café");
  });
});

describe("downloads", () => {
  const event: EventPage = {
    ...PAGE_DEFAULTS.event(),
    title: "Launch party; bring friends",
    start: "2026-11-01T18:00",
    end: "2026-11-01T21:30",
    timeZone: "America/Chicago",
    location: "Main St, Springfield",
    description: "Food, music\nand prizes",
  };

  it("converts local event times to UTC", () => {
    const times = eventTimes(event)!;
    // 1 Nov 2026 is the day US clocks fall back: 18:00 is already on standard time (UTC-6).
    expect(times.start.toISOString()).toBe("2026-11-02T00:00:00.000Z");
    expect(times.end.toISOString()).toBe("2026-11-02T03:30:00.000Z");
  });

  it("writes a valid iCalendar event", () => {
    const ics = eventIcs(
      event,
      "abc",
      "https://qr.techitdave.com/p/ABC",
      new Date("2026-10-13T00:00:00Z"),
    )!;
    expect(ics).toContain("BEGIN:VEVENT\r\n");
    expect(ics).toContain("DTSTART:20261102T000000Z\r\n");
    expect(ics).toContain("SUMMARY:Launch party\\; bring friends\r\n");
    expect(ics).toContain("Food\\, music\\nand prizes");
    expect(ics.split("\r\n").every((line) => new TextEncoder().encode(line).length <= 75)).toBe(
      true,
    );
  });

  it("handles all-day events and calendar links", () => {
    const allDay = { ...event, allDay: true, start: "2026-12-24T00:00", end: "2026-12-26T00:00" };
    const ics = eventIcs(allDay, "x", "https://e.com")!;
    expect(ics).toContain("DTSTART;VALUE=DATE:20261224");
    expect(ics).toContain("DTEND;VALUE=DATE:20261227");
    expect(googleCalendarUrl(allDay, "https://e.com")).toContain("dates=20261224%2F20261227");
  });

  it("writes a vCard with every contact detail", () => {
    const card: VcardPage = {
      ...PAGE_DEFAULTS.vcard(),
      firstName: "Ada",
      lastName: "Lovelace",
      company: "Analytical, Ltd",
      phones: [{ label: "Work", number: "+1 (555) 010-9999" }],
      emails: [
        { label: "Work", address: "ada@example.com" },
        { label: "", address: "not-an-email" },
      ],
      website: "example.com",
      socials: [{ network: "github", url: "@ada" }],
    };
    const vcf = contactVcard(card);
    expect(vcf).toContain("FN:Ada Lovelace\r\n");
    expect(vcf).toContain("ORG:Analytical\\, Ltd\r\n");
    expect(vcf).toContain("TEL;TYPE=WORK:+15550109999\r\n");
    expect(vcf).toContain("EMAIL;TYPE=INTERNET,WORK:ada@example.com\r\n");
    expect(vcf).not.toContain("not-an-email");
    expect(vcf).toContain("URL:https://example.com/\r\n");
    expect(vcf).toContain("X-SOCIALPROFILE;TYPE=github:https://github.com/ada\r\n");
  });
});

describe("validatePage names what's missing", () => {
  it("says which field to fill in", () => {
    expect(
      validatePage("links", {
        ...PAGE_DEFAULTS.links(),
        links: [{ label: "Buy me a coffee", url: "", on: true }],
      }),
    ).toMatchObject({ title: "Add a title", "links.0.url": "Add the link for “Buy me a coffee”" });
    expect(validatePage("business", PAGE_DEFAULTS.business())).toMatchObject({
      name: "Add the business name",
    });
    expect(validatePage("menu", PAGE_DEFAULTS.menu())).toMatchObject({
      name: "Add the restaurant name",
    });
    expect(validatePage("event", PAGE_DEFAULTS.event())).toMatchObject({
      title: "Add the event name",
      start: "Pick when the event starts",
    });
    expect(
      validatePage("feedback", { ...PAGE_DEFAULTS.feedback(), business: "", question: "" }),
    ).toMatchObject({ business: "Add the business name", question: "Add a question" });
    expect(validatePage("app", PAGE_DEFAULTS.app())).toMatchObject({ name: "Add the app name" });
    expect(
      validatePage("coupon", { ...PAGE_DEFAULTS.coupon(), offer: "20% off", buttonLabel: "Shop" }),
    ).toMatchObject({ buttonUrl: "Add the button’s link" });
    expect(
      validatePage("business", {
        ...PAGE_DEFAULTS.business(),
        name: "Cafe",
        buttons: [{ label: "Order", url: "", on: true }],
      }),
    ).toMatchObject({ "buttons.0.url": "Add the link for “Order”" });
  });
});

describe("links and buttons can be switched off", () => {
  it("are on unless saved as off, including pages saved before the switch existed", () => {
    const page = sanitizePage("links", {
      links: [
        { label: "A", url: "a.com" },
        { label: "B", url: "b.com", on: false },
        { label: "C", url: "c.com", on: "no" },
      ],
    });
    expect(page.links.map((link) => link.on)).toEqual([true, false, true]);
    const business = sanitizePage("business", { buttons: [{ label: "Order", url: "o.com" }] });
    expect(business.buttons[0]?.on).toBe(true);
    expect(PAGE_DEFAULTS.links().links[0]?.on).toBe(true);
  });

  it("aren't checked while off, and only links that are on count", () => {
    const base = { ...PAGE_DEFAULTS.links(), title: "Me" };
    const shop = { label: "Shop", url: "shop.com", on: true };
    expect(
      validatePage("links", { ...base, links: [{ label: "Later", url: "", on: false }, shop] }),
    ).toEqual({});
    expect(
      validatePage("links", {
        ...base,
        links: [{ label: "Bad", url: "javascript:alert(1)", on: false }, shop],
      }),
    ).toEqual({});
    expect(validatePage("links", { ...base, links: [{ ...shop, on: false }] })).toEqual({
      "links.0.url": "Turn on at least one link",
    });
    // Back on, its problem is back.
    expect(
      validatePage("links", { ...base, links: [{ label: "Later", url: "", on: true }] }),
    ).toMatchObject({ "links.0.url": "Add the link for “Later”" });
    expect(
      validatePage("business", {
        ...PAGE_DEFAULTS.business(),
        name: "Cafe",
        buttons: [{ label: "Order", url: "", on: false }],
      }),
    ).toEqual({});
  });
});
