import { describe, expect, it } from "vitest";

import { PAGE_TYPE_IDS } from "@/lib/qr/types";

import { contactVcard, eventIcs, eventTimes, googleCalendarUrl } from "./files";
import { newLink } from "./links";
import { mediaPaths, sanitizeMedia, sanitizePage } from "./sanitize";
import { PAGE_DEFAULTS, type EventPage, type Media, type VcardPage } from "./types";
import {
  audioEmbed,
  listenService,
  safeHref,
  socialHref,
  startSeconds,
  videoEmbed,
  whatsappHref,
} from "./urls";
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
    // A saved page without a look gets Paper, whose buttons are ink.
    expect(page.color).toBe("#0F172A");
    expect(page.links).toHaveLength(30);
    expect(page.links[0]).toEqual({ ...newLink(), label: "L0", url: "https://e.com", on: true });
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
    expect(gallery.images.map((item) => item.image.name)).toEqual(["1.png", "2.png"]);
  });

  it("repairs opening hours", () => {
    const page = sanitizePage("business", { hours: [{ open: false, from: "25:00", to: "18:30" }] });
    expect(page.hours).toHaveLength(7);
    expect(page.hours[0]).toEqual({ open: false, from: "09:00", to: "18:30", from2: "", to2: "" });
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
    expect(validatePage("pdf", PAGE_DEFAULTS.pdf())).toEqual({ "files.0.file": "Upload a PDF" });
    expect(
      validatePage("pdf", {
        ...PAGE_DEFAULTS.pdf(),
        files: [{ file: media("a.pdf"), title: "", preview: null }],
      }),
    ).toEqual({});
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
        { ...newLink(), label: "Bad", url: "javascript:alert(1)", on: true },
        { ...newLink(), label: "Good", url: "example.com", on: true },
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
      phones: [{ label: "Work", number: "+1 (555) 010-9999", whatsapp: false }],
      emails: [
        { label: "Work", address: "ada@example.com" },
        { label: "", address: "not-an-email" },
      ],
      websites: [{ label: "", url: "example.com" }],
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
        links: [{ ...newLink(), label: "Buy me a coffee", url: "", on: true }],
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
      validatePage("feedback", {
        ...PAGE_DEFAULTS.feedback(),
        business: "",
        questions: [{ text: "", style: "stars" }],
      }),
    ).toMatchObject({ business: "Add the business name", "questions.0.text": "Add a question" });
    expect(validatePage("app", PAGE_DEFAULTS.app())).toMatchObject({ name: "Add the app name" });
    expect(
      validatePage("coupon", { ...PAGE_DEFAULTS.coupon(), offer: "20% off", buttonLabel: "Shop" }),
    ).toMatchObject({ buttonUrl: "Add the button’s link" });
    expect(
      validatePage("business", {
        ...PAGE_DEFAULTS.business(),
        name: "Cafe",
        buttons: [{ ...newLink(), label: "Order", url: "", on: true }],
      }),
    ).toMatchObject({ "buttons.0.url": "Add the link for “Order”" });
  });
});

describe("links and buttons can be switched off", () => {
  it("are on unless saved as off, including pages saved before the switch existed", () => {
    const page = sanitizePage("links", {
      links: [
        { label: "A", url: "a.com" },
        { ...newLink(), label: "B", url: "b.com", on: false },
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
    const shop = { ...newLink(), label: "Shop", url: "shop.com", on: true };
    expect(
      validatePage("links", {
        ...base,
        links: [{ ...newLink(), label: "Later", url: "", on: false }, shop],
      }),
    ).toEqual({});
    expect(
      validatePage("links", {
        ...base,
        links: [{ ...newLink(), label: "Bad", url: "javascript:alert(1)", on: false }, shop],
      }),
    ).toEqual({});
    expect(validatePage("links", { ...base, links: [{ ...shop, on: false }] })).toEqual({
      "links.0.url": "Turn on at least one link",
    });
    // Back on, its problem is back.
    expect(
      validatePage("links", {
        ...base,
        links: [{ ...newLink(), label: "Later", url: "", on: true }],
      }),
    ).toMatchObject({ "links.0.url": "Add the link for “Later”" });
    expect(
      validatePage("business", {
        ...PAGE_DEFAULTS.business(),
        name: "Cafe",
        buttons: [{ ...newLink(), label: "Order", url: "", on: false }],
      }),
    ).toEqual({});
  });
});

describe("video pages take links only", () => {
  it("turns a saved upload page into a link page with no file", () => {
    const page = sanitizePage("video", {
      title: "Sample: Video",
      source: "upload",
      file: {
        path: "00000000-0000-0000-0000-000000000000/v.mp4",
        name: "v.mp4",
        type: "video/mp4",
        size: 1,
      },
      url: "",
    });
    expect(page).not.toHaveProperty("source");
    expect(page).not.toHaveProperty("file");
    expect(validatePage("video", page)).toEqual({ "videos.0.url": "Paste a video link" });
  });
});

describe("Contact page details", () => {
  it("turns an old single website into the first of the websites", () => {
    const page = sanitizePage("vcard", { firstName: "Ana", website: "ana.dev" });
    expect(page.websites).toEqual([{ label: "", url: "ana.dev" }]);
    expect(page).not.toHaveProperty("website");
    expect(page).toMatchObject({
      showCall: true,
      showText: true,
      showEmail: true,
      showWhatsapp: true,
      showDirections: true,
      pronouns: "",
      department: "",
      cover: null,
    });
    // A page that already has websites keeps them.
    const kept = sanitizePage("vcard", {
      websites: [{ label: "Blog", url: "b.dev" }],
      website: "x.dev",
    });
    expect(kept.websites).toEqual([{ label: "Blog", url: "b.dev" }]);
  });

  it("puts department, every website and pronouns in the saved contact card", () => {
    const card = contactVcard({
      ...PAGE_DEFAULTS.vcard(),
      firstName: "Ana",
      company: "Acme",
      department: "Design",
      pronouns: "she/her",
      bio: "Hi",
      websites: [
        { label: "Blog", url: "b.dev" },
        { label: "", url: "ana.dev" },
      ],
    });
    expect(card).toContain("ORG:Acme;Design");
    expect(card).toContain("URL:https://b.dev/");
    expect(card).toContain("URL:https://ana.dev/");
    expect(card).toContain("NOTE:Pronouns: she/her\\nHi");
  });

  it("checks each website", () => {
    const page = {
      ...PAGE_DEFAULTS.vcard(),
      firstName: "Ana",
      websites: [{ label: "", url: "not a url" }],
    };
    expect(validatePage("vcard", page)).toEqual({
      "websites.0.url": "Enter a web address, like example.com",
    });
  });
});

describe("Business hours, closures and time zone", () => {
  it("reads old hours as one range a day, and drops a bad second range", () => {
    const page = sanitizePage("business", {
      name: "B",
      hours: [
        { open: true, from: "08:00", to: "16:00" },
        { open: true, from2: "25:00", to2: "x" },
      ],
    });
    expect(page.hours[0]).toEqual({ open: true, from: "08:00", to: "16:00", from2: "", to2: "" });
    expect(page.hours[1]).toMatchObject({ from2: "", to2: "" });
    expect(page).toMatchObject({ timeZone: "", closures: [] });
  });

  it("checks the second hours, closure dates and the time zone", () => {
    const hours = PAGE_DEFAULTS.business().hours;
    hours[0] = { open: true, from: "09:00", to: "12:00", from2: "11:00", to2: "17:00" };
    hours[1] = { open: true, from: "09:00", to: "12:00", from2: "13:00", to2: "" };
    hours[2] = { open: true, from: "09:00", to: "12:00", from2: "13:00", to2: "17:00" };
    const errors = validatePage("business", {
      ...PAGE_DEFAULTS.business(),
      name: "B",
      hours,
      closures: [{ date: "", note: "Holiday" }],
      timeZone: "Mars/Base",
    });
    const second = "The second hours must start after the first and end after they start";
    expect(errors).toMatchObject({
      "hours.0": second,
      "hours.1": second,
      "closures.0.date": "Pick a date",
      timeZone: "Choose a time zone",
    });
    expect(errors).not.toHaveProperty("hours.2");
  });
});

describe("WhatsApp quick button", () => {
  it("needs the full international number, and ignores an extension", () => {
    expect(whatsappHref("+1 555 010 2030")).toBe("https://wa.me/15550102030");
    expect(whatsappHref("0044 7700 900123")).toBe("https://wa.me/447700900123");
    expect(whatsappHref("+1 555 010 2030 ext 12")).toBe("https://wa.me/15550102030");
    expect(whatsappHref("+44 7700 900123 x4")).toBe("https://wa.me/447700900123");
    expect(whatsappHref("(555) 010-2030")).toBeNull();
    expect(whatsappHref("07700 900123")).toBeNull();
    expect(whatsappHref("+1")).toBeNull();
  });

  it("asks for the country code on a number marked On WhatsApp", () => {
    const page = {
      ...PAGE_DEFAULTS.vcard(),
      firstName: "Ana",
      phones: [
        { label: "Mobile", number: "(555) 010-2030", whatsapp: true },
        { label: "Home", number: "(555) 010-4040", whatsapp: false },
      ],
    };
    expect(validatePage("vcard", page)).toEqual({
      "phones.0.number": "Add the country code, like +1 or +44",
    });
  });
});

describe("Coupon scan and badge", () => {
  it("reads an old coupon as text only with no badge", () => {
    expect(sanitizePage("coupon", { offer: "20% OFF", code: "X" })).toMatchObject({
      scan: "text",
      badge: "",
    });
    expect(sanitizePage("coupon", { offer: "X", scan: "laser" }).scan).toBe("text");
  });

  it("needs a code to scan, and one a barcode can hold", () => {
    const coupon = { ...PAGE_DEFAULTS.coupon(), offer: "20% OFF" };
    expect(validatePage("coupon", { ...coupon, scan: "qr", code: "" })).toEqual({
      code: "Add the code to scan",
    });
    expect(validatePage("coupon", { ...coupon, scan: "qr", code: "CAFÉ" })).toEqual({});
    expect(validatePage("coupon", { ...coupon, scan: "barcode", code: "CAFÉ" }).code).toMatch(
      /QR code/,
    );
  });
});

describe("Event online, agenda and hosts", () => {
  const event = {
    ...PAGE_DEFAULTS.event(),
    title: "Launch",
    start: "2030-01-10T13:00",
    timeZone: "America/New_York",
  };

  it("reads an old event as in person, with no agenda or hosts", () => {
    expect(sanitizePage("event", { title: "Old" })).toMatchObject({
      online: false,
      joinUrl: "",
      agenda: [],
      hosts: [],
    });
  });

  it("needs a join link for an online event, a title per agenda row, and a name per host", () => {
    expect(validatePage("event", { ...event, online: true })).toEqual({
      joinUrl: "Add the link to join",
    });
    expect(validatePage("event", { ...event, online: true, joinUrl: "not a link" })).toEqual({
      joinUrl: "Enter a web address, like example.com",
    });
    // A join link left over from when it was online isn't checked once it's off.
    expect(validatePage("event", { ...event, online: false, joinUrl: "not a link" })).toEqual({});
    expect(
      validatePage("event", {
        ...event,
        agenda: [
          { time: "13:00", title: "", note: "" },
          { time: "25:00", title: "Late", note: "" },
        ],
        hosts: [{ photo: null, name: "", role: "Speaker" }],
      }),
    ).toEqual({
      "agenda.0.title": "Add what’s happening",
      "agenda.1.time": "Pick a time",
      "hosts.0.name": "Add their name",
    });
  });
});

describe("an event in a time zone this browser doesn't know", () => {
  it("has no times, and its calendar links don't throw", () => {
    const event = {
      ...PAGE_DEFAULTS.event(),
      title: "Launch",
      start: "2030-01-10T13:00",
      timeZone: "Mars/Base",
    };
    expect(eventTimes(event)).toBeNull();
    expect(() => googleCalendarUrl(event, "https://ziplume.com/p/X")).not.toThrow();
  });
});

describe("Images page items", () => {
  const item = (name: string, patch: object = {}) => ({
    image: media(name),
    caption: "",
    link: "",
    ...patch,
  });

  it("reads an old page's images as items with no caption or link, in a 2-column grid", () => {
    const page = sanitizePage("images", { title: "G", images: [media("a.png"), media("b.png")] });
    expect(page.layout).toBe("grid2");
    expect(page.images).toEqual([item("a.png"), item("b.png")]);
    // Read again, it's the same.
    expect(sanitizePage("images", page)).toEqual(page);
  });

  it("drops an item without an image, and keeps captions, links and the layout", () => {
    const page = sanitizePage("images", {
      images: [
        { image: null, caption: "x" },
        item("a.png", { caption: "Sunset", link: "example.com" }),
      ],
      layout: "carousel",
    });
    expect(page.images).toEqual([item("a.png", { caption: "Sunset", link: "example.com" })]);
    expect(page.layout).toBe("carousel");
    expect(sanitizePage("images", { layout: "mosaic" }).layout).toBe("grid2");
  });

  it("checks each image's link", () => {
    const page = { ...PAGE_DEFAULTS.images(), images: [item("a.png", { link: "not a link" })] };
    expect(validatePage("images", page)).toEqual({
      "images.0.link": "Enter a web address, like example.com",
    });
  });
});

describe("video links", () => {
  it("holds TikTok, Instagram, Facebook and Loom back until a tap", () => {
    expect(
      videoEmbed("https://www.tiktok.com/@cafe/video/7234567890123456789?lang=en"),
    ).toMatchObject({
      provider: "tiktok",
      src: "https://www.tiktok.com/embed/v2/7234567890123456789",
      name: "TikTok",
      vertical: true,
      tap: true,
    });
    expect(videoEmbed("https://www.instagram.com/reels/Cx1AbC2dE3f/")).toMatchObject({
      provider: "instagram",
      src: "https://www.instagram.com/reel/Cx1AbC2dE3f/embed",
      tap: true,
    });
    expect(videoEmbed("https://m.facebook.com/watch/?v=1234567890")?.src).toBe(
      "https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Fwatch%2F%3Fv%3D1234567890&show_text=false",
    );
    expect(videoEmbed("https://www.loom.com/share/0123456789abcdef0123456789abcdef")).toMatchObject(
      {
        provider: "loom",
        src: "https://www.loom.com/embed/0123456789abcdef0123456789abcdef",
        vertical: false,
        tap: true,
      },
    );
    expect(videoEmbed("https://youtu.be/dQw4w9WgXcQ")).toMatchObject({
      tap: false,
      name: "YouTube",
    });
    // Short links and look-alikes aren't embedded.
    expect(videoEmbed("https://vm.tiktok.com/ZMabc123/")).toBeNull();
    expect(videoEmbed("https://fb.watch/abc123/")).toBeNull();
    expect(videoEmbed("https://tiktok.com.evil.example/@a/video/7234567890123456789")).toBeNull();
  });

  it("starts YouTube, Vimeo and Loom at a time like 1:23", () => {
    expect(startSeconds("1:23")).toBe(83);
    expect(startSeconds("1:02:03")).toBe(3723);
    expect(startSeconds("45")).toBe(45);
    expect(startSeconds("1:2")).toBeNull();
    expect(startSeconds("1:75")).toBeNull();
    expect(startSeconds("1m23s")).toBeNull();
    expect(startSeconds("")).toBeNull();
    expect(videoEmbed("https://youtu.be/dQw4w9WgXcQ", "1:23")?.src).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=83",
    );
    expect(videoEmbed("https://vimeo.com/76979871", "1:23")?.src).toBe(
      "https://player.vimeo.com/video/76979871?dnt=1#t=83s",
    );
    expect(
      videoEmbed("https://www.loom.com/share/0123456789abcdef0123456789abcdef", "0:10")?.src,
    ).toBe("https://www.loom.com/embed/0123456789abcdef0123456789abcdef?t=10");
    expect(videoEmbed("https://youtu.be/dQw4w9WgXcQ", "0")?.src).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
  });

  it("reads an old video page's link as its first video", () => {
    expect(
      sanitizePage("video", { title: "T", url: "https://youtu.be/dQw4w9WgXcQ" }).videos,
    ).toEqual([{ title: "", url: "https://youtu.be/dQw4w9WgXcQ", start: "" }]);
    expect(sanitizePage("video", { title: "T", url: "" }).videos).toEqual([
      { title: "", url: "", start: "" },
    ]);
    expect(sanitizePage("video", { title: "T", url: "" })).not.toHaveProperty("url");
  });

  it("needs one video, checks each link, and each start time", () => {
    const page = (videos: { title: string; url: string; start: string }[]) => ({
      ...PAGE_DEFAULTS.video(),
      videos,
    });
    expect(validatePage("video", page([{ title: "", url: "", start: "" }]))).toEqual({
      "videos.0.url": "Paste a video link",
    });
    expect(
      validatePage(
        "video",
        page([
          { title: "", url: "https://youtu.be/dQw4w9WgXcQ", start: "1:75" },
          { title: "", url: "not a link", start: "" },
        ]),
      ),
    ).toEqual({
      "videos.0.start": "Use minutes and seconds, like 1:23",
      "videos.1.url": "Enter a web address, like example.com",
    });
  });
});

describe("App store switch, screenshots and features", () => {
  it("reads an old app page with the switch on and no screenshots or features", () => {
    expect(sanitizePage("app", { name: "A" })).toMatchObject({
      storeRedirect: true,
      screenshots: [],
      features: [],
    });
    expect(
      sanitizePage("app", { name: "A", features: [{ text: "Offline" }, { text: 3 }] }).features,
    ).toEqual([{ text: "Offline" }, { text: "" }]);
  });
});

describe("an older API client's video link", () => {
  it("replaces the first video's link when it sends a url with what it fetched", () => {
    const page = sanitizePage("video", {
      title: "T",
      videos: [
        { title: "One", url: "https://youtu.be/dQw4w9WgXcQ", start: "0:10" },
        { title: "Two", url: "https://vimeo.com/76979871", start: "" },
      ],
      url: "https://vimeo.com/123456789",
    });
    expect(page.videos).toEqual([
      { title: "One", url: "https://vimeo.com/123456789", start: "0:10" },
      { title: "Two", url: "https://vimeo.com/76979871", start: "" },
    ]);
  });
});

describe("PDF pages with several files", () => {
  const pdf = (name: string) => ({
    path: `${UID}/${name}`,
    name,
    type: "application/pdf",
    size: 10,
  });

  it("reads an old page's file as its first, and an empty one as one empty row", () => {
    expect(
      sanitizePage("pdf", { title: "Menu", file: pdf("menu.pdf"), direct: true }),
    ).toMatchObject({
      files: [{ file: pdf("menu.pdf"), title: "", preview: null }],
      direct: true,
    });
    expect(sanitizePage("pdf", { title: "Menu", file: null }).files).toEqual([
      { file: null, title: "", preview: null },
    ]);
    expect(sanitizePage("pdf", { file: pdf("a.pdf") })).not.toHaveProperty("file");
  });

  it("needs one PDF, and a file on any row that has a title", () => {
    const page = (files: { file: Media | null; title: string; preview: Media | null }[]) => ({
      ...PAGE_DEFAULTS.pdf(),
      files,
    });
    expect(validatePage("pdf", page([{ file: null, title: "", preview: null }]))).toEqual({
      "files.0.file": "Upload a PDF",
    });
    expect(
      validatePage(
        "pdf",
        page([
          { file: pdf("a.pdf"), title: "", preview: null },
          { file: null, title: "Wine list", preview: null },
        ]),
      ),
    ).toEqual({ "files.1.file": "Upload a PDF, or remove this row" });
  });
});

describe("audio links", () => {
  it("embeds Spotify, SoundCloud and Apple players at their own heights", () => {
    expect(
      audioEmbed("https://open.spotify.com/intl-de/track/4uLU6hMCjMI75M1A2tKUQC?si=x"),
    ).toEqual({
      provider: "spotify",
      src: "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC",
      name: "Spotify",
      height: 152,
    });
    expect(audioEmbed("https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3")?.height).toBe(352);
    expect(audioEmbed("https://soundcloud.com/artist/a-song")).toEqual({
      provider: "soundcloud",
      src: "https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fartist%2Fa-song&visual=false",
      name: "SoundCloud",
      height: 166,
    });
    expect(audioEmbed("https://soundcloud.com/artist/sets/an-album")?.height).toBe(450);
    expect(audioEmbed("https://music.apple.com/us/album/x/1440857781?i=1440857798")).toMatchObject({
      provider: "apple",
      src: "https://embed.music.apple.com/us/album/x/1440857781?i=1440857798",
      height: 175,
    });
    expect(audioEmbed("https://podcasts.apple.com/us/podcast/a-show/id1200361736")).toMatchObject({
      src: "https://embed.podcasts.apple.com/us/podcast/a-show/id1200361736",
      height: 450,
    });
    // Short links and look-alikes aren't embedded.
    expect(audioEmbed("https://spotify.link/abc123")).toBeNull();
    expect(audioEmbed("https://on.soundcloud.com/abc")).toBeNull();
    expect(
      audioEmbed("https://open.spotify.com.evil.example/track/4uLU6hMCjMI75M1A2tKUQC"),
    ).toBeNull();
  });

  it("names a Listen on link's service from its address", () => {
    expect(listenService("https://open.spotify.com/artist/x")?.label).toBe("Spotify");
    expect(listenService("https://spotify.link/abc")?.id).toBe("spotify");
    expect(listenService("https://music.apple.com/us/artist/x/1")?.label).toBe("Apple Music");
    expect(listenService("https://podcasts.apple.com/us/podcast/x/id1")?.label).toBe(
      "Apple Podcasts",
    );
    expect(listenService("https://music.youtube.com/channel/x")?.label).toBe("YouTube Music");
    expect(listenService("https://music.amazon.co.uk/artists/x")?.label).toBe("Amazon Music");
    expect(listenService("https://www.deezer.com/artist/1")?.id).toBe("deezer");
    expect(listenService("https://link.deezer.com/s/abc")?.id).toBe("deezer");
    expect(listenService("https://listen.tidal.com/artist/1")?.id).toBe("tidal");
    expect(listenService("https://on.soundcloud.com/abc")?.id).toBe("soundcloud");
    expect(listenService("https://artist.bandcamp.com/album/x")?.label).toBe("Bandcamp");
    expect(listenService("https://example.com/music")).toBeNull();
    expect(listenService("https://bandcamp.com.evil.example/x")).toBeNull();
  });

  it("reads an old audio page with no Listen on links or tracks", () => {
    expect(
      sanitizePage("audio", { title: "T", link: "https://open.spotify.com/track/x" }),
    ).toMatchObject({
      listen: [],
      tracks: [],
    });
  });

  it("checks Listen on links and tracks", () => {
    const page = { ...PAGE_DEFAULTS.audio(), title: "T", link: "https://example.com/a" };
    expect(
      validatePage("audio", {
        ...page,
        listen: [{ url: "https://example.com/music" }],
        tracks: [{ title: "Intro", file: null, link: "" }],
      }),
    ).toEqual({
      "listen.0.url":
        "Use a link from Spotify, Apple Music, YouTube Music, Amazon Music, Deezer, Tidal, SoundCloud or Bandcamp",
      "tracks.0.file": "Upload the track or add its link",
    });
  });
});

describe("an older API client's PDF file", () => {
  it("replaces the first PDF when it sends a file with what it fetched", () => {
    const pdf = (name: string) => ({
      path: `${UID}/${name}`,
      name,
      type: "application/pdf",
      size: 10,
    });
    const page = sanitizePage("pdf", {
      title: "Menu",
      files: [
        { file: pdf("old.pdf"), title: "Food", preview: media("old.png") },
        { file: pdf("wine.pdf"), title: "", preview: null },
      ],
      file: pdf("new.pdf"),
    });
    expect(page.files).toEqual([
      { file: pdf("new.pdf"), title: "Food", preview: null },
      { file: pdf("wine.pdf"), title: "", preview: null },
    ]);
  });
});

describe("music links copied on a phone", () => {
  it("knows mobile and short links for their service", () => {
    expect(listenService("https://m.soundcloud.com/artist/a-song")?.label).toBe("SoundCloud");
    expect(listenService("https://spoti.fi/3abc")?.label).toBe("Spotify");
    expect(listenService("https://geo.music.apple.com/us/album/x/1")?.label).toBe("Apple Music");
    expect(audioEmbed("https://m.soundcloud.com/artist/a-song")?.src).toBe(
      "https://w.soundcloud.com/player/?url=https%3A%2F%2Fsoundcloud.com%2Fartist%2Fa-song&visual=false",
    );
  });
});

describe("Things visitors send back", () => {
  it("reads older Contact, Coupon and Event pages with nothing to send", () => {
    expect(sanitizePage("vcard", { firstName: "Old" }).shareDetails).toBe(false);
    expect(sanitizePage("coupon", { offer: "Old" }).markUsed).toBe(false);
    expect(sanitizePage("event", { title: "Old" })).toMatchObject({
      rsvp: false,
      rsvpCapacity: "",
    });
    expect(sanitizePage("event", { title: "New", rsvp: "yes", rsvpCapacity: 50 })).toMatchObject({
      rsvp: false,
      rsvpCapacity: "",
    });
    expect(sanitizePage("event", { rsvp: true, rsvpCapacity: "1234567" }).rsvpCapacity).toBe(
      "12345",
    );
  });

  it("checks an event's places only while it takes RSVPs", () => {
    const event = {
      ...PAGE_DEFAULTS.event(),
      title: "Launch",
      start: "2030-01-10T13:00",
      timeZone: "America/New_York",
    };
    for (const rsvpCapacity of ["lots", "0", "2.5"]) {
      expect(validatePage("event", { ...event, rsvp: true, rsvpCapacity }), rsvpCapacity).toEqual({
        rsvpCapacity: "Enter a number of places, like 50",
      });
    }
    expect(validatePage("event", { ...event, rsvp: true, rsvpCapacity: "" })).toEqual({});
    expect(validatePage("event", { ...event, rsvp: true, rsvpCapacity: "50" })).toEqual({});
    expect(validatePage("event", { ...event, rsvp: false, rsvpCapacity: "lots" })).toEqual({});
  });
});
