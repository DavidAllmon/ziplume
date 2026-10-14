import { describe, expect, it } from "vitest";

import {
  createReducer,
  DEFAULT_SETTINGS,
  initialCreateState,
  isTrackable,
  settingsErrors,
  settingsProblem,
  type CreateAction,
  type CreateState,
} from "./state";

const defaults = { type: "url" as const, folderId: null };
const run = (state: CreateState, ...actions: CreateAction[]) =>
  actions.reduce(createReducer, state);

describe("createReducer", () => {
  it("starts from the defaults with the type and folder from the address", () => {
    const state = initialCreateState({ type: "wifi", folderId: "f1" });
    expect(state.code.activeType).toBe("wifi");
    expect(state.code.name).toBe("");
    expect(state.folderId).toBe("f1");
    expect(state.settings).toEqual(DEFAULT_SETTINGS);
    expect(state.settings.trackable).toBe(true);
  });

  it("reset forgets the content, design, settings, name and folder", () => {
    const edited = run(
      initialCreateState(defaults),
      {
        type: "code",
        action: { type: "setField", qrType: "url", field: "url", value: "example.com" },
      },
      { type: "code", action: { type: "setDesign", patch: { fgColor: "#123456" } } },
      { type: "code", action: { type: "setName", name: "Poster" } },
      { type: "settings", patch: { password: "secret", slug: "SPRING" } },
      { type: "setFolder", folderId: "f2" },
    );
    expect(edited.code.content.url.url).toBe("example.com");
    expect(createReducer(edited, { type: "reset", defaults })).toEqual(
      initialCreateState(defaults),
    );
  });

  it("Reset to style goes back to the last style applied, not the plain default", () => {
    const state = run(
      initialCreateState(defaults),
      {
        type: "code",
        action: { type: "applyDesign", design: { fgColor: "#3730A3", bgColor: "#FFF1F2" } },
      },
      { type: "code", action: { type: "setDesign", patch: { fgColor: "#000000" } } },
      { type: "resetToStyle" },
    );
    expect(state.code.design.fgColor).toBe("#3730A3");
    expect(state.code.design.bgColor).toBe("#FFF1F2");
  });

  it("restore replaces the whole page", () => {
    const other = run(initialCreateState({ type: "text", folderId: "f9" }), {
      type: "settings",
      patch: { slug: "MINE" },
    });
    expect(createReducer(initialCreateState(defaults), { type: "restore", state: other })).toBe(
      other,
    );
  });

  it("knows which codes are trackable", () => {
    const link = initialCreateState(defaults);
    expect(isTrackable(link)).toBe(true);
    expect(isTrackable(run(link, { type: "settings", patch: { trackable: false } }))).toBe(false);
    expect(isTrackable(initialCreateState({ type: "links", folderId: null }))).toBe(true);
    expect(isTrackable(initialCreateState({ type: "wifi", folderId: null }))).toBe(false);
  });
});

describe("settingsErrors", () => {
  it("accepts settings left empty", () => {
    expect(settingsErrors(DEFAULT_SETTINGS)).toEqual({});
    expect(settingsProblem(DEFAULT_SETTINGS)).toBeNull();
  });

  it("explains a short password, an end before the start and a bad ending", () => {
    expect(
      settingsErrors({
        ...DEFAULT_SETTINGS,
        password: "abc",
        startsAt: "2030-02-01T09:00",
        endsAt: "2030-01-01T09:00",
        slug: "no spaces",
      }),
    ).toEqual({
      password: "Passwords are 4 to 128 characters",
      endsAt: "The end date must be after the start date",
      slug: "Link endings use 3–40 letters, numbers or dashes",
    });
    expect(settingsProblem({ ...DEFAULT_SETTINGS, slug: "no spaces" })).toBe(
      "Link endings use 3–40 letters, numbers or dashes",
    );
  });

  it("treats an end equal to the start as too early", () => {
    expect(
      settingsErrors({
        ...DEFAULT_SETTINGS,
        startsAt: "2030-01-01T09:00",
        endsAt: "2030-01-01T09:00",
      }).endsAt,
    ).toBe("The end date must be after the start date");
  });
});
