"use server";

import { inviteEmail } from "@/emails/invite";
import { getAuthState } from "@/lib/auth/server";
import { emailConfigured, sendEmail } from "@/lib/email/brevo";
import { SITE_URL, SUPABASE_URL } from "@/lib/env";
import type { TeamRole } from "@/types/supabase";

import { parseInviteEmails } from "./inviteInput";

export interface InviteOutcome {
  email: string;
  /** The invite's token, so its link can be shared by hand when it wasn't emailed. */
  token: string | null;
  status: "sent" | "link" | "failed";
  message?: string;
}

export interface InviteActionResult {
  error?: string;
  outcomes: InviteOutcome[];
}

const INVITE_COLUMNS = "id, email, role, token, expires_at";

interface InviteRow {
  id: string;
  email: string;
  role: TeamRole;
  token: string;
  expires_at: string;
}

interface Inviter {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

type Supabase = Awaited<ReturnType<typeof getAuthState>>["supabase"];

/** The signed-in user who is inviting, with the name and photo their invites show. */
async function currentInviter(): Promise<
  { error: string } | { supabase: Supabase; inviter: Inviter }
> {
  const { supabase, user, needsMfa } = await getAuthState();
  if (!user) return { error: "Your session has expired. Sign in again." };
  if (needsMfa) return { error: "Enter your two-factor code first, then try again." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  return {
    supabase,
    inviter: {
      id: user.id,
      email: user.email ?? "",
      name: profile?.display_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
    },
  };
}

/** Records the send (the database enforces the limits), then emails the invite. */
async function deliver(
  supabase: Supabase,
  inviter: Inviter,
  invite: InviteRow,
): Promise<InviteOutcome> {
  const base = { email: invite.email, token: invite.token };
  if (!emailConfigured()) return { ...base, status: "link" };
  const { error } = await supabase.rpc("record_invite_send", { p_invite: invite.id });
  if (error) {
    const limit = /invites in the last hour|emailed 5 times/.test(error.message);
    return {
      ...base,
      status: "link",
      message: limit
        ? `${error.message}. Share the link instead.`
        : "The invite couldn’t be emailed. Share the link instead.",
    };
  }
  const content = inviteEmail({
    inviter,
    to: invite.email,
    role: invite.role,
    acceptUrl: `${SITE_URL}/invite/${invite.token}`,
    expiresAt: invite.expires_at,
    supabaseUrl: SUPABASE_URL,
  });
  const sent = await sendEmail({
    to: invite.email,
    ...content,
    replyTo: inviter.email
      ? { email: inviter.email, ...(inviter.name ? { name: inviter.name } : {}) }
      : undefined,
  });
  return sent.ok
    ? { ...base, status: "sent" }
    : { ...base, status: "failed", message: "The email couldn’t be sent. Share the link instead." };
}

/**
 * Invites up to 10 people. With `email`, each invite is emailed when this server can send email;
 * otherwise (or when a limit is reached) its link comes back to share by hand.
 */
export async function sendInvites(input: {
  emails: string;
  role: TeamRole;
  email: boolean;
}): Promise<InviteActionResult> {
  if (input.role !== "editor" && input.role !== "viewer") {
    return { error: "Choose Editor or Viewer.", outcomes: [] };
  }
  const current = await currentInviter();
  if ("error" in current) return { error: current.error, outcomes: [] };
  const { supabase, inviter } = current;

  const [{ data: members }, { data: pending }] = await Promise.all([
    supabase.rpc("team_overview"),
    supabase
      .from("team_invites")
      .select(INVITE_COLUMNS)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString()),
  ]);
  const parsed = parseInviteEmails(input.emails, {
    self: inviter.email,
    members: (members ?? []).map((m) => m.email),
  });
  if (!parsed.ok) return { error: parsed.error, outcomes: [] };

  const outcomes: InviteOutcome[] = [];
  for (const email of parsed.emails) {
    const sameAddress = (pending ?? []).filter(
      (p) => p.email.toLowerCase() === email.toLowerCase(),
    );
    let invite: InviteRow | null = sameAddress.find((p) => p.role === input.role) ?? null;
    // An invite for the same address with another role is replaced, so only one link works.
    for (const stale of sameAddress.filter((p) => p.role !== input.role)) {
      await supabase.from("team_invites").delete().eq("id", stale.id);
    }
    if (!invite) {
      const { data, error } = await supabase
        .from("team_invites")
        .insert({ email, role: input.role })
        .select(INVITE_COLUMNS)
        .single();
      if (error || !data) {
        outcomes.push({
          email,
          token: null,
          status: "failed",
          message: "The invite couldn’t be created. Please try again.",
        });
        continue;
      }
      invite = data;
    }
    outcomes.push(
      input.email
        ? await deliver(supabase, inviter, invite)
        : { email: invite.email, token: invite.token, status: "link" },
    );
  }
  return { outcomes };
}

/** Emails a pending invite again. */
export async function resendInvite(inviteId: string): Promise<InviteActionResult> {
  const current = await currentInviter();
  if ("error" in current) return { error: current.error, outcomes: [] };
  const { supabase, inviter } = current;
  const { data: invite } = await supabase
    .from("team_invites")
    .select(INVITE_COLUMNS)
    .eq("id", inviteId)
    .is("accepted_at", null)
    .maybeSingle();
  if (!invite) return { error: "That invite has ended. Create a new one.", outcomes: [] };
  if (!emailConfigured()) {
    return { error: "Email invites aren’t set up on this server.", outcomes: [] };
  }
  return { outcomes: [await deliver(supabase, inviter, invite)] };
}
