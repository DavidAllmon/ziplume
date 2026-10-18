// @vitest-environment node
import { describe, expect, it } from "vitest";

import { isOffToken, offLinks, offToken } from "./response-links";

const CODE = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const OWNER = "33333333-3333-4333-8333-333333333333";

describe("response email off links", () => {
  it("only match the code and maker they were made for", () => {
    const token = offToken("secret", CODE, OWNER);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(isOffToken("secret", CODE, OWNER, token)).toBe(true);
    expect(isOffToken("secret", OTHER, OWNER, token)).toBe(false);
    expect(isOffToken("secret", CODE, OTHER, token)).toBe(false);
    expect(isOffToken("another-secret", CODE, OWNER, token)).toBe(false);
    for (const bad of ["", "x", `${token}x`, token.slice(0, -1)]) {
      expect(isOffToken("secret", CODE, OWNER, bad), bad).toBe(false);
    }
  });

  it("point a person at the page and a mail app at the one-click address", () => {
    const token = offToken("secret", CODE, OWNER);
    expect(offLinks("https://ziplume.example", "secret", CODE, OWNER)).toEqual({
      page: `https://ziplume.example/email/responses-off?c=${CODE}&t=${token}`,
      oneClick: `https://ziplume.example/email/responses-off/stop?c=${CODE}&t=${token}`,
    });
  });
});
