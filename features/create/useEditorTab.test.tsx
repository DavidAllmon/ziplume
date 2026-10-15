import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { EditorTab } from "./tabs";
import { useEditorTab } from "./useEditorTab";

const ALL = ["content", "look", "qr", "settings"] as const;
const NO_LOOK = ["content", "qr", "settings"] as const;

afterEach(() => window.history.replaceState(null, "", "/"));

describe("useEditorTab", () => {
  it("opens the tab in the address, and keeps the choice there", () => {
    window.history.replaceState({ kept: true }, "", "/codes/new?type=links#qr");
    const { result } = renderHook(() => useEditorTab(ALL));
    expect(result.current[0]).toBe("qr");
    act(() => result.current[1]("settings"));
    expect(result.current[0]).toBe("settings");
    expect(window.location.hash).toBe("#settings");
    expect(window.location.search).toBe("?type=links");
    // History state (Next's, and the unsaved-changes guard's copy marker) is left alone.
    expect(window.history.state).toEqual({ kept: true });
  });

  it("opens Content for an unknown tab or one this type doesn't have", () => {
    window.history.replaceState(null, "", "/codes/new#download");
    expect(renderHook(() => useEditorTab(ALL)).result.current[0]).toBe("content");
    window.history.replaceState(null, "", "/codes/new#look");
    expect(renderHook(() => useEditorTab(NO_LOOK)).result.current[0]).toBe("content");
  });

  it("falls back to Content when the chosen tab goes away", () => {
    window.history.replaceState(null, "", "/codes/new");
    const { result, rerender } = renderHook(({ tabs }) => useEditorTab(tabs), {
      initialProps: { tabs: [...ALL] as EditorTab[] },
    });
    act(() => result.current[1]("look"));
    rerender({ tabs: [...NO_LOOK] });
    expect(result.current[0]).toBe("content");
  });
});
