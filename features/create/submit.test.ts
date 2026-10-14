import { describe, expect, it } from "vitest";

import { createReducer, initialCreateState, type CreateAction, type CreateState } from "./state";
import { localToIso, taggedDestination, toNewCode } from "./submit";

const run = (state: CreateState, ...actions: CreateAction[]) =>
  actions.reduce(createReducer, state);
const base = initialCreateState({ type: "url", folderId: "f1" });
const withLink = run(base, {
  type: "code",
  action: { type: "setField", qrType: "url", field: "url", value: "https://example.com/menu" },
});

describe("toNewCode", () => {
  it("sends a trackable link with its tags, ending, password and dates", () => {
    const state = run(withLink, {
      type: "settings",
      patch: {
        password: "open sesame",
        startsAt: "2030-01-01T09:00",
        slug: "SPRING",
        utm: { source: "flyer", medium: "qr", campaign: "" },
      },
    });
    const { input, settings } = toNewCode(state, "team-1", "Menu");
    expect(input).toMatchObject({
      ownerId: "team-1",
      folderId: "f1",
      name: "Menu",
      qrType: "url",
      dynamic: {
        destination: "https://example.com/menu?utm_source=flyer&utm_medium=qr",
        slug: "SPRING",
      },
    });
    expect(settings).toEqual({
      password: "open sesame",
      activeFrom: new Date("2030-01-01T09:00").toISOString(),
      activeUntil: null,
    });
  });

  it("makes a static link when Trackable is off, ignoring settings typed earlier", () => {
    const state = run(withLink, {
      type: "settings",
      patch: { trackable: false, password: "secret", startsAt: "2030-01-01T09:00" },
    });
    const { input, settings } = toNewCode(state, null, "Menu");
    expect(input.dynamic).toBeUndefined();
    expect(input.content).toEqual({ url: "https://example.com/menu" });
    expect(settings).toEqual({});
  });

  it("keeps Wi-Fi static even with Trackable on, ignoring settings", () => {
    const state = run(
      withLink,
      { type: "settings", patch: { password: "secret", endsAt: "2030-01-01T09:00" } },
      { type: "code", action: { type: "setActiveType", activeType: "wifi" } },
      { type: "code", action: { type: "setField", qrType: "wifi", field: "ssid", value: "Cafe" } },
    );
    const { input, settings } = toNewCode(state, null, "Cafe Wi-Fi");
    expect(input).toMatchObject({
      qrType: "wifi",
      content: expect.objectContaining({ ssid: "Cafe" }),
    });
    expect(input.dynamic).toBeUndefined();
    expect(settings).toEqual({});
  });

  it("sends a hosted page as trackable with no destination", () => {
    const state = run(base, {
      type: "code",
      action: { type: "setActiveType", activeType: "links" },
    });
    const { input } = toNewCode(state, null, "Links");
    expect(input.dynamic).toEqual({ destination: null });
    expect(input.content).toBe(state.code.pages.links);
  });

  it("leaves the owner out for your own codes", () => {
    expect(toNewCode(withLink, null, "Menu").input).not.toHaveProperty("ownerId");
  });
});

describe("helpers", () => {
  it("adds campaign tags only when some are filled in", () => {
    const none = { source: "", medium: "", campaign: "" };
    expect(taggedDestination("example.com", none)).toBe("https://example.com");
    expect(taggedDestination("https://example.com/?a=1", { ...none, campaign: "fall" })).toBe(
      "https://example.com/?a=1&utm_campaign=fall",
    );
  });

  it("reads a local date-time as the viewer's time zone", () => {
    expect(localToIso("")).toBeNull();
    expect(localToIso("2030-01-01T09:00")).toBe(new Date(2030, 0, 1, 9, 0).toISOString());
  });
});
