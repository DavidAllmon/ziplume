import { avatarColors, initialsOf, trustedAvatarUrl } from "@/lib/avatar";
import type { TeamRole } from "@/types/supabase";

export interface InviteEmailInput {
  inviter: { id: string; name: string | null; email: string; avatarUrl: string | null };
  /** The invited address. */
  to: string;
  role: TeamRole;
  acceptUrl: string;
  /** ISO time the invite stops working. */
  expiresAt: string;
  /** The project's Supabase URL, so uploaded photos count as trusted. */
  supabaseUrl?: string;
}

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ESCAPES[c] ?? c);

/** Collapses line breaks and runs of spaces (names go into a mail subject). */
const oneLine = (value: string) => value.replace(/\s+/g, " ").trim();

const ROLE_LINE: Record<TeamRole, string> = {
  editor: "an Editor: you can create, change and delete codes and folders, and see their analytics",
  viewer: "a Viewer: you can see codes, scan analytics and feedback",
};

/** The email that invites someone to another person's codes. */
export function inviteEmail(input: InviteEmailInput): EmailContent {
  const e = escapeHtml;
  const inviter = oneLine(input.inviter.name ?? "") || input.inviter.email;
  const subject = `${inviter} invited you to their QuickQReate codes`.slice(0, 200);
  const expires = new Date(input.expiresAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
  const role = ROLE_LINE[input.role];
  const photo = trustedAvatarUrl(input.inviter.avatarUrl, input.supabaseUrl);
  const colors = avatarColors(input.inviter.id);
  const badge = photo
    ? `<img src="${e(photo)}" width="40" height="40" alt="" style="display:block;width:40px;height:40px;border-radius:20px;" />`
    : `<div style="width:40px;height:40px;border-radius:20px;background:${colors.bg};color:${colors.fg};font-size:15px;font-weight:700;line-height:40px;text-align:center;">${e(initialsOf(input.inviter.name, input.inviter.email))}</div>`;

  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>${e(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f2f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#101828;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f7;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #eaecf0;">
            <tr>
              <td style="padding:32px 32px 0;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:12px;vertical-align:middle;">${badge}</td>
                    <td style="vertical-align:middle;font-size:17px;font-weight:700;line-height:1.4;color:#101828;">${e(inviter)} invited you to their QuickQReate codes</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0;">
                <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#344054;">You’ll be ${e(role)}.</p>
                <a href="${e(input.acceptUrl)}" style="display:inline-block;background:#101828;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:8px;">Accept invite</a>
                <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#475467;">If the button doesn’t work, copy this link into your browser:<br /><a href="${e(input.acceptUrl)}" style="color:#1d4ed8;word-break:break-all;">${e(input.acceptUrl)}</a></p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#475467;">This invite is for ${e(input.to)} and expires ${e(expires)}. If you weren’t expecting it, you can ignore this email.</p>
              </td>
            </tr>
          </table>
          <p style="margin:16px 0 0;font-size:13px;color:#475467;">QuickQReate · Free QR codes that never stop working</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `${inviter} invited you to their QuickQReate codes.`,
    "",
    `You’ll be ${role}.`,
    "",
    `Accept the invite: ${input.acceptUrl}`,
    "",
    `This invite is for ${input.to} and expires ${expires}. If you weren’t expecting it, you can ignore this email.`,
    "",
    "QuickQReate · Free QR codes that never stop working",
  ].join("\n");

  return { subject, html, text };
}
