import { describe, expect, it } from "vitest";

import { parseInviteEmails } from "./inviteInput";

const parse = (raw: string, members: string[] = []) =>
  parseInviteEmails(raw, { self: "david@example.com", members });

describe("parseInviteEmails", () => {
  it("splits on commas, semicolons, spaces and new lines, dropping repeats", () => {
    expect(parse("sam@cafe.com, lee@cafe.com;\nSAM@cafe.com  jo@cafe.com")).toEqual({
      ok: true,
      emails: ["sam@cafe.com", "lee@cafe.com", "jo@cafe.com"],
    });
  });

  it("needs at least one address, and only real-looking ones", () => {
    expect(parse("  ,\n ")).toEqual({ ok: false, error: "Enter at least one email address." });
    expect(parse("sam@cafe.com, nope")).toEqual({
      ok: false,
      error: "“nope” isn’t an email address.",
    });
  });

  it("allows up to 10 at a time", () => {
    const eleven = Array.from({ length: 11 }, (_, i) => `p${i}@cafe.com`).join(",");
    expect(parse(eleven)).toEqual({ ok: false, error: "Invite up to 10 people at a time." });
  });

  it("won't invite you or someone already on the team", () => {
    expect(parse("David@Example.com")).toEqual({
      ok: false,
      error: "That’s your own address. Invite someone else.",
    });
    expect(parse("lee@cafe.com", ["LEE@cafe.com"])).toEqual({
      ok: false,
      error: "lee@cafe.com is already on your team. Change their role below instead.",
    });
  });
});
