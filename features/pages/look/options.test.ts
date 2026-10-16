import { describe, expect, it } from "vitest";

import { PAGE_DEFAULTS } from "@/lib/pages/types";
import type { PageTypeId } from "@/lib/qr/types";

import { hasShape, hasSocials, headerChoice, heroImage } from "./options";

const UID = "11111111-1111-4111-8111-111111111111";
const media = { path: `${UID}/a.jpg`, name: "a.jpg", type: "image/jpeg", size: 1 };
const types = (...ids: string[]) => ids as PageTypeId[];

describe("look options per type", () => {
  it("offer Classic or Hero where spec 6.4 does", () => {
    expect(
      types("links", "vcard", "business", "menu", "feedback", "audio").every(headerChoice),
    ).toBe(true);
    expect(types("coupon", "event", "app", "pdf", "images", "video").some(headerChoice)).toBe(
      false,
    );
  });

  it("offer the image shape and social icons only where the page uses them", () => {
    expect(hasShape("links") && hasShape("vcard")).toBe(true);
    expect(hasShape("business") || hasShape("audio")).toBe(false);
    expect(types("links", "vcard", "business").every(hasSocials)).toBe(true);
    expect(hasSocials("menu")).toBe(false);
  });

  it("find the Hero's image: the profile picture, photo, cover, logo or cover art", () => {
    expect(heroImage("links", { ...PAGE_DEFAULTS.links(), avatar: media })).toEqual(media);
    expect(heroImage("business", { ...PAGE_DEFAULTS.business(), logo: media })).toBeNull();
    expect(heroImage("business", { ...PAGE_DEFAULTS.business(), cover: media })).toEqual(media);
    expect(heroImage("audio", PAGE_DEFAULTS.audio())).toBeNull();
  });
});
