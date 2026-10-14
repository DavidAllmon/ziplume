"use server";

import { redirect } from "next/navigation";

import { acceptError } from "@/features/teams/acceptError";
import { getServerSupabase } from "@/lib/supabase/server";
import { personLabel, toTeam } from "@/lib/teams/access";

export interface AcceptResult {
  error?: string;
}

/** Joins the workspace an invite is for, then opens it. */
export async function acceptInvite(token: string): Promise<AcceptResult> {
  const supabase = await getServerSupabase();
  const { data: ownerId, error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error || !ownerId) {
    const message = error?.message ?? "";
    let names: { currentOwner: string | null; inviter: string | null } = {
      currentOwner: null,
      inviter: null,
    };
    if (/another team/i.test(message)) {
      const [{ data: team }, { data: details }] = await Promise.all([
        supabase.rpc("my_team"),
        supabase.rpc("invite_details", { p_token: token }),
      ]);
      const owner = toTeam(team ?? []).find((person) => person.role === "owner");
      const invite = details as { owner_name?: string | null; owner_email?: string } | null;
      names = {
        currentOwner: owner ? personLabel(owner) : null,
        inviter: invite?.owner_name?.trim() || invite?.owner_email || null,
      };
    }
    return { error: acceptError(message, names) };
  }
  redirect(`/codes?workspace=${ownerId}`);
}
