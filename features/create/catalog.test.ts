import { describe, expect, it } from "vitest";

import { PAGE_TYPE_IDS, QR_TYPE_IDS } from "@/lib/qr/types";

import {
  COMMON_TYPES,
  isContactType,
  moreTypes,
  tileFor,
  typeDescription,
  typeLabel,
} from "./catalog";

describe("type catalog", () => {
  it("offers the eight common types as tiles", () => {
    expect(COMMON_TYPES.map(typeLabel)).toEqual([
      "Link",
      "Link list",
      "Wi-Fi",
      "Contact",
      "PDF",
      "Menu",
      "Text",
      "Email",
    ]);
    expect(typeDescription("url")).toBe("Open a website");
  });

  it("lists every type once under More types, with Contact covering both kinds", () => {
    const groups = moreTypes("");
    expect(groups.map((group) => group.title)).toEqual(["Works without internet", "Hosted pages"]);
    const ids = groups.flatMap((group) => group.ids);
    expect(ids).toContain("contact");
    expect(ids).not.toContain("vcard");
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toHaveLength(QR_TYPE_IDS.length + PAGE_TYPE_IDS.length - 1);
  });

  it("searches names and descriptions", () => {
    expect(moreTypes("whatsapp").flatMap((group) => group.ids)).toEqual(["whatsapp"]);
    expect(moreTypes("  MENU ").flatMap((group) => group.ids)).toEqual(["menu"]);
    expect(moreTypes("zzz")).toEqual([]);
  });

  it("shows both contact kinds as Contact", () => {
    expect(tileFor("vcard")).toBe("contact");
    expect(tileFor("wifi")).toBe("wifi");
    expect(isContactType("vcard") && isContactType("contact")).toBe(true);
    expect(typeLabel("vcard")).toBe("Contact");
  });
});
