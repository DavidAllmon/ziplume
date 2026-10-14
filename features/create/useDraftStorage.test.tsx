import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { draftKey, saveDraft } from "./draft";
import { createReducer, initialCreateState, type CreateState } from "./state";
import { useDraftStorage } from "./useDraftStorage";

const USER = "user-1";
const defaults = { type: "url" as const, folderId: null };
const fresh = initialCreateState(defaults);
const typed = (url: string, password = ""): CreateState =>
  createReducer(
    createReducer(fresh, {
      type: "code",
      action: { type: "setField", qrType: "url", field: "url", value: url },
    }),
    { type: "settings", patch: { password } },
  );
const stored = () => window.localStorage.getItem(draftKey(USER));

function setup(state: CreateState, onRestore = vi.fn()) {
  return renderHook(
    (props: { state: CreateState }) =>
      useDraftStorage({ userId: USER, state: props.state, defaults, onRestore }),
    { initialProps: { state } },
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  window.localStorage.clear();
});
afterEach(() => vi.useRealTimers());

describe("useDraftStorage", () => {
  it("saves unfinished work half a second after it changes, never the password", () => {
    const { rerender, result } = setup(fresh);
    rerender({ state: typed("https://example.com/a", "open sesame") });
    act(() => vi.advanceTimersByTime(499));
    expect(stored()).toBeNull();
    act(() => vi.advanceTimersByTime(1));
    expect(stored()).toContain("https://example.com/a");
    expect(stored()).not.toContain("open sesame");
    expect(result.current.offer).toBeNull();
  });

  it("offers an older draft and leaves it alone until Resume or Discard", () => {
    saveDraft(USER, typed("https://example.com/old"), new Date("2026-10-14T10:00:00Z"));
    const before = stored();
    const onRestore = vi.fn();
    const { rerender, result } = setup(fresh, onRestore);
    expect(result.current.offer?.savedAt).toBe("2026-10-14T10:00:00.000Z");
    rerender({ state: typed("https://example.com/new") });
    act(() => vi.advanceTimersByTime(2000));
    expect(stored()).toBe(before);

    act(() => result.current.resume());
    expect(onRestore).toHaveBeenCalledTimes(1);
    expect(onRestore.mock.calls[0]![0].code.content.url.url).toBe("https://example.com/old");
    expect(result.current.offer).toBeNull();
  });

  it("Discard removes the draft", () => {
    saveDraft(USER, typed("https://example.com/old"));
    const { result } = setup(fresh);
    act(() => result.current.discard());
    expect(stored()).toBeNull();
    expect(result.current.offer).toBeNull();
  });

  it("finishing removes this page's draft, even if a save was still waiting", () => {
    const { rerender, result } = setup(fresh);
    rerender({ state: typed("https://example.com/mine") });
    act(() => vi.advanceTimersByTime(500));
    expect(stored()).toContain("mine");
    rerender({ state: typed("https://example.com/mine-2") });
    act(() => result.current.finished());
    act(() => vi.advanceTimersByTime(1000));
    expect(stored()).toBeNull();
  });

  it("finishing keeps an older draft that is still on offer", () => {
    saveDraft(USER, typed("https://example.com/old"));
    const { result } = setup(fresh);
    act(() => result.current.finished());
    expect(stored()).toContain("https://example.com/old");
  });
});
