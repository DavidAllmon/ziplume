"use server";

import { copyMediaFiles } from "@/features/teams/media";
import { getAuthState } from "@/lib/auth/server";
import { replaceMediaPaths } from "@/lib/pages/media";
import { mediaPaths } from "@/lib/pages/sanitize";

/**
 * For copying a teammate's hosted page into your own codes: its images and files are copied into
 * your folder, and the content returned points at the copies, so your copy keeps working whatever
 * happens to theirs. Your own pages come back unchanged.
 */
export async function copyCodeMedia(
  codeId: string,
): Promise<{ ok: true; content: unknown } | { ok: false; error: string }> {
  const { supabase, user, needsMfa } = await getAuthState();
  if (!user || needsMfa) return { ok: false, error: "Sign in again, then try once more." };
  // Read as the signed-in person: only codes they can see (never a teammate's private one).
  const { data: code } = await supabase
    .from("qr_codes")
    .select("user_id, content")
    .eq("id", codeId)
    .maybeSingle();
  if (!code) return { ok: false, error: "That code couldn’t be found." };
  if (code.user_id === user.id) return { ok: true, content: code.content };
  const copied = await copyMediaFiles(mediaPaths(code.content), code.user_id, user.id);
  if (!copied.ok) return { ok: false, error: "Its images couldn’t be copied. Please try again." };
  return {
    ok: true,
    content: replaceMediaPaths(code.content, new Map(Object.entries(copied.renamed))),
  };
}
