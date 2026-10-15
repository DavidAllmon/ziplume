import { emailLayout, paragraph } from "./layout";

export type AuthTemplate = "confirm" | "recovery" | "email-change" | "magic-link";

const SITE = "{{ .SiteURL }}";
const confirmLink = (type: string, next: string) =>
  `${SITE}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=${type}&amp;next=${next}`;
const COFFEE =
  ' · <a href="https://buymeacoffee.com/davidallmon" style="color:#0b6e8c;">Buy me a coffee</a>';

/** The sign-in server's emails (Go templates: it fills in {{ .SiteURL }}, {{ .Email }} and the token). */
export const AUTH_TEMPLATES: Record<AuthTemplate, string> = {
  confirm: emailLayout({
    title: "Confirm your Ziplume account",
    body: paragraph(
      "Thanks for signing up. Confirm that {{ .Email }} is your address to start saving codes and tracking scans.",
    ),
    button: { label: "Confirm my email", href: confirmLink("email", "/codes") },
    note: "Didn't create an account? You can ignore this email; nothing happens until the link is used.",
    siteUrl: SITE,
    footerExtra: COFFEE,
  }),
  recovery: emailLayout({
    title: "Reset your password",
    body: paragraph(
      "Someone asked to reset the password for {{ .Email }}. Use the button to choose a new one. The link works once and expires after an hour.",
    ),
    button: {
      label: "Choose a new password",
      href: confirmLink("recovery", "/account/update-password"),
    },
    note: "Didn't ask for this? Ignore this email and your password stays the same.",
    siteUrl: SITE,
    footerExtra: COFFEE,
  }),
  "email-change": emailLayout({
    title: "Confirm your new email",
    body: paragraph(
      "Confirm that you want to change your Ziplume sign-in email from {{ .Email }} to {{ .NewEmail }}.",
    ),
    button: { label: "Confirm new email", href: confirmLink("email_change", "/settings") },
    note: "Didn't request this change? Ignore this email and your account keeps its current address.",
    siteUrl: SITE,
    footerExtra: COFFEE,
  }),
  "magic-link": emailLayout({
    title: "Your sign-in link",
    body: paragraph(
      "Use this link to sign in to Ziplume as {{ .Email }}. It works once and expires soon.",
    ),
    button: { label: "Sign in", href: confirmLink("magiclink", "/codes") },
    note: "Didn't try to sign in? You can safely ignore this email.",
    siteUrl: SITE,
    footerExtra: COFFEE,
  }),
};
