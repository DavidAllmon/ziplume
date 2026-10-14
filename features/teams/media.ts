import "server-only";

import { mediaPaths } from "@/lib/pages/sanitize";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { Json } from "@/types/supabase";

const BUCKET = "page-media";
const FAILED = {
  ok: false as const,
  error: "Their page images couldn’t be copied, so nobody was removed. Please try again.",
};

/**
 * Copies files from one person's page-media folder into another's. Files that are already gone
 * are skipped (and counted); any other failure stops the copy.
 */
export async function copyMediaFiles(
  paths: string[],
  fromId: string,
  toId: string,
): Promise<{ ok: true; renamed: Record<string, string>; missing: number } | { ok: false }> {
  const admin = getAdminSupabase();
  if (!admin) return { ok: false };
  const renamed: Record<string, string> = {};
  let missing = 0;
  for (const path of new Set(paths)) {
    if (!path.startsWith(`${fromId}/`)) continue;
    const copy = `${toId}/${path.slice(fromId.length + 1)}`;
    const { error } = await admin.storage.from(BUCKET).copy(path, copy);
    if (error && /not.?found/i.test(error.message)) {
      missing += 1;
      continue;
    }
    // A file copied on an earlier attempt is already there, which is fine.
    if (error && !/exist|duplicate/i.test(error.message)) return { ok: false };
    renamed[path] = copy;
  }
  return { ok: true, renamed, missing };
}

/**
 * For removing someone and keeping their codes: copies the files their shared pages use into the
 * owner's folder, and returns those pages and the old-to-new paths. Nothing is rewritten here;
 * the pages are repointed only after their codes have moved, so a removal that stops partway
 * leaves every page exactly as it was.
 */
export async function copyPageMedia(
  memberId: string,
  ownerId: string,
): Promise<
  | {
      ok: true;
      pages: { id: string; content: Json }[];
      renamed: Record<string, string>;
      files: number;
      missing: number;
    }
  | { ok: false; error: string }
> {
  const admin = getAdminSupabase();
  if (!admin) return FAILED;
  const { data, error } = await admin
    .from("qr_codes")
    .select("id, content")
    .eq("user_id", memberId)
    .eq("is_private", false);
  if (error) return FAILED;
  const pages = (data ?? []).filter((page) =>
    mediaPaths(page.content).some((path) => path.startsWith(`${memberId}/`)),
  );
  const copied = await copyMediaFiles(
    pages.flatMap((page) => mediaPaths(page.content)),
    memberId,
    ownerId,
  );
  if (!copied.ok) return FAILED;
  return {
    ok: true,
    pages,
    renamed: copied.renamed,
    files: Object.keys(copied.renamed).length,
    missing: copied.missing,
  };
}
