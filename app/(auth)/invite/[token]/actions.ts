"use server";

import { redirect } from "next/navigation";

import { getServerSupabase } from "@/lib/supabase/server";

export interface AcceptResult {
  error?: string;
}

/** Joins the workspace an invite is for, then opens it. */
export async function acceptInvite(token: string): Promise<AcceptResult> {
  const supabase = await getServerSupabase();
  const { data: ownerId, error } = await supabase.rpc("accept_invite", { p_token: token });
  if (error || !ownerId) {
    return {
      error: /different email/i.test(error?.message ?? "")
        ? "This invite is for a different email address."
        : /no longer valid/i.test(error?.message ?? "")
          ? "This invite has expired or was already used. Ask for a new link."
          : "The invite couldn’t be accepted. Please try again.",
    };
  }
  redirect(`/dashboard?workspace=${ownerId}`);
}
