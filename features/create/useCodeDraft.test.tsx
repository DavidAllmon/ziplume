import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { dynamicPayload, PREVIEW_SLUG } from "@/lib/dynamic/slug";

import { savedRow } from "./fixtures";
import { fromSavedCode } from "./load";
import { useCodeDraft } from "./useCodeDraft";

// Real scan checks render to a canvas, which jsdom does not have.
vi.mock("@/features/generator/preview/useScanVerification", () => ({
  useScanVerification: () => null,
}));

const setup = (type: "url" | "wifi" | "links" = "url") =>
  renderHook(() => useCodeDraft({ type, folderId: null }));

describe("useCodeDraft", () => {
  it("says what's missing, then previews a trackable link's short link", () => {
    const { result } = setup();
    expect(result.current.trackable).toBe(true);
    expect(result.current.blocker).toBe("Add a link to start");
    act(() => result.current.setField("url", "url", "example.com/menu"));
    expect(result.current.blocker).toBeNull();
    expect(result.current.data).toBe(dynamicPayload(PREVIEW_SLUG));
    expect(result.current.defaultName).toBe("example.com/menu");
  });

  it("explains a bad link before anything else", () => {
    const { result } = setup();
    act(() => result.current.setField("url", "url", "not a link"));
    expect(result.current.blocker).toBe("Enter a web address, like example.com");
  });

  it("previews the chosen ending, and blocks a malformed one", () => {
    const { result } = setup();
    act(() => result.current.setField("url", "url", "example.com"));
    act(() => result.current.dispatch({ type: "settings", patch: { slug: "SPRING" } }));
    expect(result.current.data).toBe(dynamicPayload("SPRING"));
    act(() => result.current.dispatch({ type: "settings", patch: { slug: "no spaces" } }));
    expect(result.current.data).toBe(dynamicPayload(PREVIEW_SLUG));
    expect(result.current.blocker).toBe("Link endings use 3–40 letters, numbers or dashes");
  });

  it("encodes a static link directly and ignores its settings", () => {
    const { result } = setup();
    act(() => result.current.setField("url", "url", "example.com"));
    act(() =>
      result.current.dispatch({ type: "settings", patch: { trackable: false, password: "ab" } }),
    );
    expect(result.current.trackable).toBe(false);
    expect(result.current.data).toBe("https://example.com");
    expect(result.current.blocker).toBeNull();
  });

  it("explains that a trackable link needs a web address", () => {
    const { result } = setup();
    act(() => result.current.setField("url", "url", "mailto:hi@example.com"));
    expect(result.current.blocker).toBe(
      "Trackable links need a web address (http or https). Turn off Trackable for other links.",
    );
    act(() => result.current.dispatch({ type: "settings", patch: { trackable: false } }));
    expect(result.current.blocker).toBeNull();
  });

  it("never makes Wi-Fi trackable", () => {
    const { result } = setup("wifi");
    expect(result.current.trackable).toBe(false);
  });

  it("names the file after the content", () => {
    const { result } = setup();
    act(() => result.current.setField("url", "url", "example.com"));
    expect(result.current.filename).toMatch(/example-com.*\.png$/);
  });
});

describe("useCodeDraft opening a saved code", () => {
  it("starts from the saved code and previews its real short link", () => {
    const initial = fromSavedCode(savedRow());
    const { result } = renderHook(() =>
      useCodeDraft({ type: "url", folderId: null }, { initial, requireSlug: true }),
    );
    expect(result.current.state).toBe(initial);
    expect(result.current.data).toBe(dynamicPayload("SPRING"));
    expect(result.current.blocker).toBeNull();
    act(() => result.current.dispatch({ type: "settings", patch: { slug: "" } }));
    expect(result.current.blocker).toBe("Every trackable code needs a link ending");
  });
});
