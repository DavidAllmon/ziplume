"use server";

import { redirect } from "next/navigation";

import { getAuthState } from "@/lib/auth/server";
import { getAdminSupabase } from "@/lib/supabase/admin";

export interface ActionResult {
  error?: string;
}

/** Permanently deletes the signed-in user's account; codes and scans cascade with it. */
export async function deleteAccount(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  if (formData.get("confirm") !== "DELETE") return { error: "Type DELETE to confirm." };

  const { supabase, user, needsMfa } = await getAuthState();
  if (!user) return { error: "Your session has expired. Sign in again." };
  if (needsMfa) return { error: "Enter your two-factor code first, then try again." };

  const admin = getAdminSupabase();
  if (!admin) return { error: "Account deletion isn't configured on this server yet." };

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) return { error: "Your account couldn't be deleted. Please try again." };

  await supabase.auth.signOut();
  redirect("/?account=deleted");
}
