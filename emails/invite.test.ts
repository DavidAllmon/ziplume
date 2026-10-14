import { describe, expect, it } from "vitest";

import { inviteEmail, inviterName, type InviteEmailInput } from "./invite";

const base: InviteEmailInput = {
  inviter: { id: "u1", name: "David Allmon", email: "david@example.com", avatarUrl: null },
  to: "sam@cafe.com",
  role: "editor",
  acceptUrl: "https://qr.example/invite/abc",
  expiresAt: "2026-10-28T12:00:00Z",
};
const withInviter = (patch: Partial<InviteEmailInput["inviter"]>) => ({
  ...base,
  inviter: { ...base.inviter, ...patch },
});

describe("inviteEmail", () => {
  it("names the inviter in the subject, or uses their email", () => {
    expect(inviteEmail(base).subject).toBe("David Allmon invited you to their QuickQReate codes");
    expect(inviteEmail(withInviter({ name: null })).subject).toBe(
      "david@example.com invited you to their QuickQReate codes",
    );
    expect(inviteEmail(withInviter({ name: "Eve\r\nBcc: x@example.com" })).subject).not.toMatch(
      /[\r\n]/,
    );
  });

  it("escapes names in the HTML", () => {
    const { html } = inviteEmail(withInviter({ name: "<img src=x onerror=alert(1)>" }));
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });

  it("has the button link, role, address and expiry in both versions", () => {
    const { html, text } = inviteEmail(base);
    expect(html).toContain('href="https://qr.example/invite/abc"');
    for (const part of ["an Editor", "sam@cafe.com", "October 28, 2026"]) {
      expect(html).toContain(part);
      expect(text).toContain(part);
    }
    expect(text).toContain("Accept the invite: https://qr.example/invite/abc");
    expect(inviteEmail({ ...base, role: "viewer" }).text).toContain("a Viewer");
  });

  it("shows only trusted photos, and initials otherwise", () => {
    const google = "https://lh3.googleusercontent.com/a/david";
    expect(inviteEmail(withInviter({ avatarUrl: google })).html).toContain(`<img src="${google}"`);
    const tracked = inviteEmail(withInviter({ avatarUrl: "https://tracker.example/p.gif" })).html;
    expect(tracked).not.toContain("tracker.example");
    expect(tracked).toContain(">DA</div>");
  });
});

describe("inviterName", () => {
  it("keeps ordinary names", () => {
    expect(inviterName("Dr. Jo Smith", "jo@example.com")).toBe("Dr. Jo Smith");
    expect(inviterName("J.R. Allmon", "jr@example.com")).toBe("J.R. Allmon");
  });

  it("uses the email address instead of names that look like links", () => {
    for (const name of [
      "Claim refund at evil.example",
      "www.prize.win",
      "https://x.co",
      "Call me",
    ]) {
      const expected = name === "Call me" ? "Call me" : "david@example.com";
      expect(inviterName(name, "david@example.com")).toBe(expected);
    }
    const { subject, html, text } = inviteEmail(
      withInviter({ name: "Claim refund at evil.example" }),
    );
    expect(subject).toBe("david@example.com invited you to their QuickQReate codes");
    expect(html).not.toContain("evil.example");
    expect(text).not.toContain("evil.example");
  });
});
