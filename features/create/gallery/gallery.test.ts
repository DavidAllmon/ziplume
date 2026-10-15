import { describe, expect, it } from "vitest";

import { galleryGroups, galleryLabel } from "./gallery";

describe("galleryGroups", () => {
  it("puts Link first, then the 12 pages, then the instant codes", () => {
    const groups = galleryGroups("");
    expect(groups.map((group) => group.title)).toEqual(["Link", "Pages", "Instant codes"]);
    expect(groups[0]!.ids).toEqual(["url"]);
    expect(groups[1]!.ids).toHaveLength(12);
    expect(groups[1]!.ids).toContain("vcard");
    expect(groups[2]!.ids).toEqual([
      "text",
      "wifi",
      "contact",
      "email",
      "phone",
      "sms",
      "whatsapp",
      "location",
      "payment",
    ]);
  });

  it("tells the two contact kinds apart", () => {
    expect(galleryLabel("contact")).toBe("Contact card");
    expect(galleryLabel("vcard")).toBe("Contact page");
    expect(galleryLabel("url")).toBe("Link");
  });

  it("filters by name and description, dropping empty groups", () => {
    expect(galleryGroups("wi-fi").flatMap((group) => group.ids)).toEqual(["wifi"]);
    // Business describes its "contact buttons", so it matches too.
    expect(galleryGroups("contact").flatMap((group) => group.ids)).toEqual(
      expect.arrayContaining(["vcard", "contact"]),
    );
    expect(galleryGroups("zzz")).toEqual([]);
  });
});
