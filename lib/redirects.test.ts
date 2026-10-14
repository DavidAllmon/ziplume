import { describe, expect, it } from "vitest";

import { editRedirect } from "./redirects";

const at = (path: string) => new URL(path, "https://qr.example");

describe("editRedirect", () => {
  it("sends the old home-page edit address to the code's editor", () => {
    expect(editRedirect(at("/?edit=abc-123"))?.toString()).toBe(
      "https://qr.example/codes/abc-123/edit",
    );
  });

  it("leaves everything else alone", () => {
    expect(editRedirect(at("/"))).toBeNull();
    expect(editRedirect(at("/?type=wifi"))).toBeNull();
    expect(editRedirect(at("/?edit="))).toBeNull();
    expect(editRedirect(at("/codes?edit=abc"))).toBeNull();
  });

  it("keeps odd characters from escaping the path", () => {
    expect(editRedirect(at("/?edit=..%2Fsettings"))?.pathname).toBe("/codes/..%2Fsettings/edit");
  });
});
