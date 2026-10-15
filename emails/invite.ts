import { avatarColors, initialsOf, trustedAvatarUrl } from "@/lib/avatar";

import type { TeamRole } from "@/types/supabase";

import { emailLayout, paragraph } from "./layout";

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

/** A web address or domain inside a name, like "evil.example" or "https://…". */
const LOOKS_LIKE_LINK = /:\/\/|www\.|[a-z0-9-]{2,}\.[a-z]{2,}/i;

/**
 * The name an invite shows for its sender. A display name that looks like a link is replaced by
 * the sender's email address, so invites can't be used to send phishing links in our name.
 */
export function inviterName(name: string | null, email: string): string {
  const clean = oneLine(name ?? "");
  return clean && !LOOKS_LIKE_LINK.test(clean) ? clean : email;
}

const ROLE_LINE: Record<TeamRole, string> = {
  editor: "an Editor: you can create, change and delete codes and folders, and see their analytics",
  viewer: "a Viewer: you can see codes, scan analytics and feedback",
};

/** The email that invites someone to another person's codes. */
export function inviteEmail(input: InviteEmailInput): EmailContent {
  const e = escapeHtml;
  const inviter = inviterName(input.inviter.name, input.inviter.email);
  const subject = `${inviter} invited you to their Ziplume codes`.slice(0, 200);
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

  const heading = `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="padding-right:12px;vertical-align:middle;">${badge}</td><td style="vertical-align:middle;font-size:17px;font-weight:700;line-height:1.4;color:#0a1330;">${e(inviter)} invited you to their Ziplume codes</td></tr></table>`;
  const html = emailLayout({
    title: e(subject),
    heading,
    body: paragraph(`You’ll be ${e(role)}.`),
    button: { label: "Accept invite", href: e(input.acceptUrl) },
    note: `This invite is for ${e(input.to)} and expires ${e(expires)}. If you weren’t expecting it, you can ignore this email.`,
    siteUrl: new URL(input.acceptUrl).origin,
  });

  const text = [
    `${inviter} invited you to their Ziplume codes.`,
    "",
    `You’ll be ${role}.`,
    "",
    `Accept the invite: ${input.acceptUrl}`,
    "",
    `This invite is for ${input.to} and expires ${expires}. If you weren’t expecting it, you can ignore this email.`,
    "",
    "Ziplume · Make it. Link it. Share it.",
  ].join("\n");

  return { subject, html, text };
}
