import { describe, expect, it } from "vitest";

import { acceptError } from "./acceptError";

const names = { currentOwner: "Sam", inviter: "David" };

describe("acceptError", () => {
  it("names both teams when you're already in one", () => {
    expect(acceptError("You're already in another team", names)).toBe(
      "You’re in Sam’s team. Leave it before joining David’s.",
    );
    expect(
      acceptError("You're already in another team", { currentOwner: null, inviter: null }),
    ).toBe("You’re already in a team. Leave it before joining this one.");
  });

  it("explains owning a team, wrong addresses and old links", () => {
    expect(acceptError("You have your own team", names)).toBe(
      "You have your own team. Remove its members before joining another.",
    );
    expect(acceptError("This invite is for a different email address", names)).toBe(
      "This invite is for a different email address.",
    );
    expect(acceptError("This invite is no longer valid", names)).toBe(
      "This invite has expired or was already used. Ask for a new link.",
    );
    expect(acceptError("boom", names)).toBe("The invite couldn’t be accepted. Please try again.");
  });
});
