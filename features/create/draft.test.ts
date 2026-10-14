import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearDraft, draftKey, isBlank, parseDraft, rawDraft, saveDraft } from "./draft";
import { createReducer, initialCreateState, type CreateAction, type CreateState } from "./state";

const USER = "user-1";
const defaults = { type: "url" as const, folderId: "f1" };
const run = (state: CreateState, ...actions: CreateAction[]) =>
  actions.reduce(createReducer, state);
const edited = run(
  initialCreateState(defaults),
  { type: "code", action: { type: "setActiveType", activeType: "text" } },
  { type: "code", action: { type: "setField", qrType: "text", field: "text", value: "Hello" } },
  { type: "code", action: { type: "setDesign", patch: { fgColor: "#3730A3" } } },
  { type: "code", action: { type: "setName", name: "Greeting" } },
  {
    type: "settings",
    patch: { password: "open sesame", slug: "HELLO", startsAt: "2030-01-01T09:00" },
  },
  { type: "setFolder", folderId: "f2" },
);

beforeEach(() => window.localStorage.clear());

describe("drafts", () => {
  it("are kept per person under a versioned key", () => {
    expect(draftKey(USER)).toBe("quickqreate:draft:v2:user-1");
  });

  it("never store the password", () => {
    saveDraft(USER, edited);
    expect(window.localStorage.getItem(draftKey(USER))).not.toContain("open sesame");
    expect(parseDraft(rawDraft(USER))?.state.settings.password).toBe("");
  });

  it("bring back the type, content, design, settings, name and folder", () => {
    saveDraft(USER, edited, new Date("2026-10-14T10:00:00Z"));
    const draft = parseDraft(rawDraft(USER));
    expect(draft?.savedAt).toBe("2026-10-14T10:00:00.000Z");
    expect(draft?.state).toEqual({ ...edited, settings: { ...edited.settings, password: "" } });
  });

  it("ignore anything that isn't a current draft", () => {
    expect(parseDraft(null)).toBeNull();
    expect(parseDraft("not json")).toBeNull();
    expect(parseDraft(JSON.stringify({ v: 1, savedAt: "2026-10-14T10:00:00Z" }))).toBeNull();
    expect(parseDraft(JSON.stringify({ v: 2, savedAt: "yesterday" }))).toBeNull();
  });

  it("fill in missing or bad fields with defaults", () => {
    const draft = parseDraft(
      JSON.stringify({
        v: 2,
        savedAt: "2026-10-14T10:00:00Z",
        code: { activeType: "bogus", name: 42 },
        settings: { trackable: "yes", slug: ["x"] },
      }),
    );
    const fresh = initialCreateState({ type: "url", folderId: null });
    expect(draft?.state.code.activeType).toBe("url");
    expect(draft?.state.code.name).toBe("");
    expect(draft?.state.code.content).toEqual(fresh.code.content);
    expect(draft?.state.settings).toEqual(fresh.settings);
    expect(draft?.state.folderId).toBeNull();
  });

  it("count as blank only while nothing has changed", () => {
    expect(isBlank(initialCreateState(defaults), defaults)).toBe(true);
    expect(isBlank(edited, defaults)).toBe(false);
    expect(
      isBlank(
        run(initialCreateState(defaults), { type: "settings", patch: { password: "x" } }),
        defaults,
      ),
    ).toBe(true); // The password alone is never kept, so it isn't worth a draft.
  });

  it("can be cleared, and survive storage that is blocked", () => {
    saveDraft(USER, edited);
    clearDraft(USER);
    expect(rawDraft(USER)).toBeNull();
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(rawDraft(USER)).toBeNull();
    getItem.mockRestore();
  });
});
