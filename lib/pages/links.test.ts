import { describe, expect, it } from "vitest";

import { isShown, linkHref, linkIcon, networkFromUrl, newHeader, newLink } from "./links";
import { sanitizePage } from "./sanitize";
import { PAGE_DEFAULTS, type LinkItem } from "./types";
import { validatePage } from "./validate";

const link = (patch: Partial<LinkItem> = {}): LinkItem => ({ ...newLink(), ...patch });
const UID = "11111111-1111-4111-8111-111111111111";

describe("links on a Link list", () => {
  it("reads an old saved link as a shown website link with an automatic icon", () => {
    const page = sanitizePage("links", {
      title: "Hi",
      links: [{ label: "Shop", url: "shop.com", on: true }],
    });
    expect(page.links[0]).toEqual({
      label: "Shop",
      url: "shop.com",
      on: true,
      kind: "link",
      type: "web",
      icon: "auto",
      image: null,
      featured: false,
      showFrom: "",
      showUntil: "",
    });
  });

  it("builds each type's address, and none for a malformed one", () => {
    // Web links come out as safeHref has always written them.
    expect(linkHref(link({ url: "shop.com" }))).toBe("https://shop.com/");
    expect(linkHref(link({ type: "email", url: "hi@shop.com" }))).toBe("mailto:hi@shop.com");
    expect(linkHref(link({ type: "phone", url: "+1 (555) 010-2030" }))).toBe("tel:+15550102030");
    expect(linkHref(link({ type: "sms", url: "555 010 2030" }))).toBe("sms:5550102030");
    expect(linkHref(link({ type: "email", url: "not an email" }))).toBeNull();
    expect(linkHref(link({ type: "phone", url: "call me" }))).toBeNull();
    expect(linkHref(newHeader())).toBeNull();
  });

  it("shows a scheduled link only inside its window", () => {
    const from = "2030-01-10T17:00:00.000Z";
    const until = "2030-01-12T17:00:00.000Z";
    const both = link({ showFrom: from, showUntil: until });
    expect(isShown(both, new Date("2030-01-10T16:59:59Z"))).toBe(false);
    expect(isShown(both, new Date(from))).toBe(true);
    expect(isShown(both, new Date("2030-01-12T16:59:59Z"))).toBe(true);
    expect(isShown(both, new Date(until))).toBe(false);
    expect(isShown(link({ showFrom: from }), new Date("2031-01-01T00:00:00Z"))).toBe(true);
    expect(isShown(link({ showUntil: until }), new Date("2020-01-01T00:00:00Z"))).toBe(true);
    expect(isShown(link({ on: false }), new Date())).toBe(false);
    expect(isShown(newHeader(), new Date())).toBe(false);
  });

  it("knows the sites people link to most, and nothing else", () => {
    expect(networkFromUrl("https://www.instagram.com/mybakery")).toBe("instagram");
    expect(networkFromUrl("youtu.be/abc")).toBe("youtube");
    expect(networkFromUrl("https://twitter.com/me")).toBe("x");
    expect(networkFromUrl("https://open.spotify.com/artist/1")).toBe("spotify");
    expect(networkFromUrl("https://www.linkedin.com/in/me")).toBe("linkedin");
    expect(networkFromUrl("https://example.com")).toBeNull();
    expect(networkFromUrl("not a url")).toBeNull();
  });

  it("picks a link's icon: a known site, its type, its image, or none", () => {
    expect(linkIcon(link({ url: "instagram.com/me" }))).toEqual({
      kind: "network",
      network: "instagram",
    });
    expect(linkIcon(link({ url: "example.com" }))).toBeNull();
    expect(linkIcon(link({ type: "email", url: "a@b.co" }))).toEqual({
      kind: "type",
      type: "email",
    });
    expect(linkIcon(link({ url: "instagram.com/me", icon: "none" }))).toBeNull();
    const image = { path: `${UID}/i.png`, name: "i.png", type: "image/png", size: 1 };
    expect(linkIcon(link({ icon: "image", image }))).toEqual({ kind: "image", image });
    // An image icon with no image falls back to automatic.
    expect(linkIcon(link({ icon: "image", url: "instagram.com/me" }))).toEqual({
      kind: "network",
      network: "instagram",
    });
  });

  it("checks each link by its type, ignores headers, and wants an end after the start", () => {
    const page = {
      ...PAGE_DEFAULTS.links(),
      title: "Hi",
      links: [
        newHeader(),
        link({ label: "Mail", type: "email", url: "nope" }),
        link({ label: "Call", type: "phone", url: "letters" }),
        link({
          label: "Sale",
          url: "shop.com",
          showFrom: "2030-01-12T00:00:00.000Z",
          showUntil: "2030-01-10T00:00:00.000Z",
        }),
      ],
    };
    expect(validatePage("links", page)).toEqual({
      "links.1.url": "Enter a valid email",
      "links.2.url": "Enter a valid phone number",
      "links.3.showUntil": "End after the start",
    });
  });

  it("doesn't count headers as links", () => {
    const page = {
      ...PAGE_DEFAULTS.links(),
      title: "Hi",
      links: [{ ...newHeader(), label: "Shop" }],
    };
    expect(validatePage("links", page)).toEqual({ "links.0.url": "Add at least one link" });
  });
});
