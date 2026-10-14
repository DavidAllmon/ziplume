import "server-only";

import { replaceMediaPaths } from "@/lib/pages/media";
import { mediaPaths } from "@/lib/pages/sanitize";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { Json } from "@/types/supabase";

const BUCKET = "page-media";
const FAILED = {
  ok: false as const,
  error: "Their page images couldn’t be copied, so nobody was removed. Please try again.",
};

/**
 * Copies a member's hosted-page images and files into the owner's media folder and points their
 * shared pages at the copies, so the pages keep working once they move to the owner (even if
 * the member deletes their account later). Runs before remove_member: if anything fails here,
 * nobody is removed. Pages already pointed at copies keep working either way.
 */
export async function copyPageMedia(
  memberId: string,
  ownerId: string,
): Promise<{ ok: true; files: number } | { ok: false; error: string }> {
  const admin = getAdminSupabase();
  if (!admin) return FAILED;
  const { data: pages, error } = await admin
    .from("qr_codes")
    .select("id, content")
    .eq("user_id", memberId)
    .eq("is_private", false);
  if (error) return FAILED;

  let files = 0;
  for (const page of pages ?? []) {
    const paths = mediaPaths(page.content).filter((path) => path.startsWith(`${memberId}/`));
    if (paths.length === 0) continue;
    const renamed = new Map<string, string>();
    for (const path of paths) {
      const copy = `${ownerId}/${path.slice(memberId.length + 1)}`;
      const { error: copyError } = await admin.storage.from(BUCKET).copy(path, copy);
      // A file copied on an earlier attempt is already there, which is fine.
      if (copyError && !/exist|duplicate/i.test(copyError.message)) return FAILED;
      renamed.set(path, copy);
      files += 1;
    }
    const { error: updateError } = await admin
      .from("qr_codes")
      .update({ content: replaceMediaPaths(page.content, renamed) as Json })
      .eq("id", page.id);
    if (updateError) return FAILED;
  }
  return { ok: true, files };
}
