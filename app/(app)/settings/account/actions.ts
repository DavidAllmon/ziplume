"use server";

import { redirect } from "next/navigation";

import { getAuthState } from "@/lib/auth/server";
import { AVATAR_BUCKET } from "@/lib/avatar";
import { MEDIA_BUCKET } from "@/lib/pages/urls";
import { getAdminSupabase } from "@/lib/supabase/admin";

type Admin = NonNullable<ReturnType<typeof getAdminSupabase>>;

/** Best effort: a missing Storage service or a failed listing must not block deletion. */
async function removeUserFiles(admin: Admin, userId: string, bucketName: string) {
  try {
    const bucket = admin.storage.from(bucketName);
    for (let round = 0; round < 50; round++) {
      const { data, error } = await bucket.list(userId, { limit: 1000 });
      if (error || !data?.length) return;
      const { error: removeError } = await bucket.remove(
        data.map((file) => `${userId}/${file.name}`),
      );
      if (removeError) return;
    }
  } catch {
    // Storage unavailable: nothing to clean up.
  }
}

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

  // Remove the user's uploaded files first; their codes and scans cascade with the user.
  await removeUserFiles(admin, user.id, MEDIA_BUCKET);
  await removeUserFiles(admin, user.id, AVATAR_BUCKET);
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) return { error: "Your account couldn't be deleted. Please try again." };

  await supabase.auth.signOut();
  redirect("/?account=deleted");
}
