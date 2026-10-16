import { describe, expect, it } from "vitest";

import { pageDescription, pageImage } from "./meta";
import { PAGE_DEFAULTS } from "./types";

const UID = "11111111-1111-4111-8111-111111111111";
const media = { path: `${UID}/a.jpg`, name: "a.jpg", type: "image/jpeg", size: 1 };

describe("page metadata", () => {
  it("describes a page by its bio, tagline or description", () => {
    expect(pageDescription("links", { ...PAGE_DEFAULTS.links(), bio: "Cafe in town" })).toBe(
      "Cafe in town",
    );
    expect(
      pageDescription("business", { ...PAGE_DEFAULTS.business(), tagline: "Fresh bread" }),
    ).toBe("Fresh bread");
    expect(pageDescription("event", { ...PAGE_DEFAULTS.event(), description: "A fair" })).toBe(
      "A fair",
    );
    expect(pageDescription("links", PAGE_DEFAULTS.links())).toBeNull();
  });

  it("shares the header image when the page has one", () => {
    expect(pageImage("links", { ...PAGE_DEFAULTS.links(), avatar: media })).toEqual(media);
    expect(pageImage("business", { ...PAGE_DEFAULTS.business(), logo: media })).toEqual(media);
    expect(pageImage("pdf", PAGE_DEFAULTS.pdf())).toBeNull();
  });
});
