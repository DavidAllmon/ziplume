import { describe, expect, it } from "vitest";

import { sanitizePage } from "@/lib/pages/sanitize";

import { savedRow } from "./fixtures";
import { fromSavedCode, isEditableType, isoToLocalInput, splitDestination } from "./load";

describe("isoToLocalInput", () => {
  it("shows a time in this browser's time zone, and nothing for none", () => {
    expect(isoToLocalInput(new Date(2030, 0, 2, 9, 5).toISOString())).toBe("2030-01-02T09:05");
    expect(isoToLocalInput(null)).toBe("");
    expect(isoToLocalInput("not a date")).toBe("");
  });
});

describe("splitDestination", () => {
  it("separates campaign tags and keeps the address's other parameters", () => {
    expect(
      splitDestination("https://example.com/menu?table=4&utm_source=flyer&utm_campaign=fall"),
    ).toEqual({
      url: "https://example.com/menu?table=4",
      utm: { source: "flyer", medium: "", campaign: "fall", term: "", content: "" },
    });
  });

  it("leaves an address without tags exactly as it was", () => {
    expect(splitDestination("https://example.com")).toEqual({
      url: "https://example.com",
      utm: { source: "", medium: "", campaign: "", term: "", content: "" },
    });
  });
});

describe("fromSavedCode", () => {
  it("opens a trackable link with its tags, ending, dates, folder and name", () => {
    const from = new Date(2030, 0, 2, 9, 0).toISOString();
    const state = fromSavedCode(
      savedRow({
        destination: "https://example.com/menu?utm_source=flyer",
        content: { url: "https://example.com/menu?utm_source=flyer" },
        active_from: from,
        folder_id: "f1",
      }),
    );
    expect(state.code.activeType).toBe("url");
    expect(state.code.content.url.url).toBe("https://example.com/menu");
    expect(state.code.name).toBe("Spring menu");
    expect(state.code.design.fgColor).toBe("#123456");
    expect(state.styleDesign).toEqual(state.code.design);
    expect(state.settings).toMatchObject({
      trackable: true,
      password: "",
      slug: "SPRING",
      startsAt: "2030-01-02T09:00",
      endsAt: "",
      utm: { source: "flyer", medium: "", campaign: "" },
    });
    expect(state.folderId).toBe("f1");
  });

  it("opens a static code with its content and Trackable off", () => {
    const state = fromSavedCode(
      savedRow({
        qr_type: "wifi",
        is_dynamic: false,
        slug: null,
        destination: null,
        content: { ssid: "Cafe", password: "beans", security: "WPA", hidden: false },
      }),
    );
    expect(state.code.activeType).toBe("wifi");
    expect(state.code.content.wifi.ssid).toBe("Cafe");
    expect(state.settings.trackable).toBe(false);
    expect(state.settings.slug).toBe("");
  });

  it("opens a hosted page as its page", () => {
    const content = { title: "Cafe links" };
    const state = fromSavedCode(savedRow({ qr_type: "links", destination: null, content }));
    expect(state.code.activeType).toBe("links");
    expect(state.code.pages.links).toEqual(sanitizePage("links", content));
  });
});

describe("isEditableType", () => {
  it("knows the editor's types", () => {
    expect(isEditableType("url")).toBe(true);
    expect(isEditableType("links")).toBe(true);
    expect(isEditableType("fax")).toBe(false);
  });
});
