import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { dynamicPayload } from "@/lib/dynamic/slug";

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
    expect(result.current.data).toBe(dynamicPayload("PREVIEW"));
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
    expect(result.current.data).toBe(dynamicPayload("PREVIEW"));
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
