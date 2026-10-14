import { describe, expect, it } from "vitest";

import { editTransition } from "./editTransition";

describe("editTransition", () => {
  it("does nothing for a fresh page", () => {
    expect(editTransition(null, null)).toBe("none");
  });

  it("starts fresh when ?edit= disappears (for example, clicking the logo)", () => {
    expect(editTransition(null, "a")).toBe("reset");
  });

  it("does nothing when the URL names the code already open (right after saving it)", () => {
    expect(editTransition("a", "a")).toBe("none");
  });

  it("loads a code named in the URL", () => {
    expect(editTransition("a", null)).toBe("load");
    expect(editTransition("b", "a")).toBe("load");
  });
});
