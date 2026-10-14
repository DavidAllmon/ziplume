import { describe, expect, it } from "vitest";

import { savedRow } from "./fixtures";
import { fromSavedCode } from "./load";
import { createReducer, initialCreateState, type CreateAction, type CreateState } from "./state";
import { hasChanges, localToIso, taggedDestination, toCodePatch, toNewCode } from "./submit";

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

const after = (state: CreateState, ...actions: CreateAction[]) =>
  actions.reduce(createReducer, state);
const setField = (qrType: "url" | "text", field: string, value: string): CreateAction => ({
  type: "code",
  action: { type: "setField", qrType, field, value },
});
const keepName = (state: CreateState) => ({ name: state.code.name, removePassword: false });

describe("toCodePatch", () => {
  const link = () => fromSavedCode(savedRow());

  it("finds nothing to save in an untouched code", () => {
    const initial = link();
    expect(hasChanges(toCodePatch(initial, initial, keepName(initial)))).toBe(false);
  });

  it("sends only the name when only the name changed", () => {
    const initial = link();
    expect(toCodePatch(initial, initial, { name: "Lunch menu", removePassword: false })).toEqual({
      patch: { name: "Lunch menu" },
      password: { action: "keep" },
    });
  });

  it("sends a trackable link's new address with its tags, as its content too", () => {
    const initial = link();
    const current = after(initial, setField("url", "url", "example.com/lunch"), {
      type: "settings",
      patch: { utm: { source: "flyer", medium: "", campaign: "" } },
    });
    const { patch } = toCodePatch(initial, current, keepName(initial));
    expect(patch.destination).toBe("https://example.com/lunch?utm_source=flyer");
    expect(patch.content).toEqual({ url: "https://example.com/lunch?utm_source=flyer" });
  });

  it("keeps other query parameters and leaves the address alone when only the name changes", () => {
    const initial = fromSavedCode(
      savedRow({ destination: "https://example.com/menu?table=4&utm_source=flyer" }),
    );
    expect(toCodePatch(initial, initial, { name: "Renamed", removePassword: false }).patch).toEqual(
      {
        name: "Renamed",
      },
    );
    const current = after(initial, {
      type: "settings",
      patch: { utm: { ...initial.settings.utm, medium: "qr" } },
    });
    expect(toCodePatch(initial, current, keepName(initial)).patch.destination).toBe(
      "https://example.com/menu?table=4&utm_source=flyer&utm_medium=qr",
    );
  });

  it("sends a static code's content and never its settings", () => {
    const initial = fromSavedCode(
      savedRow({
        qr_type: "text",
        is_dynamic: false,
        slug: null,
        destination: null,
        content: { text: "Hi" },
      }),
    );
    const current = after(initial, setField("text", "text", "Hello"), {
      type: "settings",
      patch: { startsAt: "2030-01-01T09:00", password: "secret" },
    });
    expect(toCodePatch(initial, current, keepName(initial))).toEqual({
      patch: { content: { text: "Hello" } },
      password: { action: "keep" },
    });
  });

  it("sends a hosted page's page as its content", () => {
    const initial = fromSavedCode(
      savedRow({ qr_type: "links", destination: null, content: { title: "Cafe" } }),
    );
    const page = { ...initial.code.pages.links, title: "Cafe links" };
    const current = after(initial, {
      type: "code",
      action: { type: "setPage", pageType: "links", content: page },
    });
    expect(toCodePatch(initial, current, keepName(initial)).patch).toEqual({ content: page });
  });

  it("sends the design, folder, ending and dates only when they changed", () => {
    const initial = link();
    const current = after(
      initial,
      { type: "code", action: { type: "setDesign", patch: { fgColor: "#000000" } } },
      { type: "setFolder", folderId: "f2" },
      { type: "settings", patch: { slug: "LUNCH", endsAt: "2030-02-01T09:00" } },
    );
    const { patch } = toCodePatch(initial, current, keepName(initial));
    expect(Object.keys(patch).sort()).toEqual(["activeUntil", "design", "folderId", "slug"]);
    expect(patch.activeUntil).toBe(new Date("2030-02-01T09:00").toISOString());
  });

  it("unchanged dates are never sent, so saving can't shift them", () => {
    const initial = fromSavedCode(savedRow({ active_from: "2030-01-02T17:00:00.000Z" }));
    const current = after(initial, { type: "setFolder", folderId: "f2" });
    expect(toCodePatch(initial, current, keepName(initial)).patch).toEqual({ folderId: "f2" });
  });

  it("sets a typed password, clears one on Remove, and keeps it otherwise", () => {
    const initial = fromSavedCode(savedRow({ has_password: true }));
    const typed = after(initial, { type: "settings", patch: { password: "new secret" } });
    expect(toCodePatch(initial, typed, keepName(initial)).password).toEqual({
      action: "set",
      password: "new secret",
    });
    expect(
      toCodePatch(initial, initial, { name: initial.code.name, removePassword: true }).password,
    ).toEqual({
      action: "clear",
    });
    expect(toCodePatch(initial, initial, keepName(initial)).password).toEqual({ action: "keep" });
  });
});
