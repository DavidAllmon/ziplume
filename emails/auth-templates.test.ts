import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { AUTH_TEMPLATES, type AuthTemplate } from "./auth-templates";

const fileFor = (name: AuthTemplate) =>
  resolve(process.cwd(), `public/email-templates/${name}.html`);
// The sign-in server fetches these files; regenerate them with
// UPDATE_EMAIL_TEMPLATES=1 npm test -- emails/auth-templates.test.ts
const update = process.env.UPDATE_EMAIL_TEMPLATES === "1";

describe.each(Object.keys(AUTH_TEMPLATES) as AuthTemplate[])("%s email", (name) => {
  const html = AUTH_TEMPLATES[name];

  it("matches the file the sign-in server sends", () => {
    if (update) writeFileSync(fileFor(name), html);
    expect(readFileSync(fileFor(name), "utf8")).toBe(html);
  });

  it("links back with a one-time token", () => {
    expect(html).toContain("{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}");
  });

  it("is branded Ziplume, in navy", () => {
    expect(html).toContain('src="{{ .SiteURL }}/brand/email-header.png"');
    expect(html).toContain("background:#0a1330");
    expect(html).toMatch(/Ziplume · Make it\. Link it\. Share it\./);
    expect(html).not.toMatch(/quickqreate/i);
  });

  it("keeps the header readable when images are blocked", () => {
    expect(html).toMatch(/<img [^>]*alt="Ziplume"[^>]*style="[^"]*color:#ffffff/);
  });
});

describe("each email's own link", () => {
  it("confirms, resets, changes the address or signs in", () => {
    expect(AUTH_TEMPLATES.confirm).toContain("type=email&amp;next=/codes");
    expect(AUTH_TEMPLATES.recovery).toContain("type=recovery&amp;next=/account/update-password");
    expect(AUTH_TEMPLATES["email-change"]).toContain("type=email_change&amp;next=/settings");
    expect(AUTH_TEMPLATES["magic-link"]).toContain("type=magiclink&amp;next=/codes");
  });
});
