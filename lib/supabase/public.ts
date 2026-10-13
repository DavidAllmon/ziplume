import "server-only";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";

import { isUnlocked, unlockCookieName } from "@/lib/dynamic/unlock";
import { SUPABASE_ANON_KEY, SUPABASE_URL, accountsEnabled } from "@/lib/env";
import { sanitizePage } from "@/lib/pages/sanitize";
import type { PageContentMap } from "@/lib/pages/types";
import { isPageType, type PageTypeId } from "@/lib/qr/types";
import type { CodeState, Database } from "@/types/supabase";

import { getAdminSupabase } from "./admin";

/** Anonymous client with no session: sees only what is public (hosted pages). */
function getPublicSupabase() {
  if (!accountsEnabled) return null;
  return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type PublicPage = {
  [K in PageTypeId]: {
    slug: string;
    type: K;
    status: CodeState;
    /** Password-protected and not unlocked by this visitor: content is withheld. */
    locked: boolean;
    content: PageContentMap[K];
    updatedAt: string;
  };
}[PageTypeId];

function toPage(data: unknown, locked: boolean): PublicPage | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null;
  const row = data as Record<string, unknown>;
  const type = String(row.qr_type);
  if (!isPageType(type)) return null;
  const status = ["active", "paused", "scheduled", "expired"].includes(String(row.status))
    ? (row.status as CodeState)
    : "paused";
  return {
    slug: String(row.slug),
    type,
    status,
    locked,
    content: sanitizePage(type, locked ? {} : row.content),
    updatedAt: String(row.updated_at ?? ""),
  } as PublicPage;
}

/**
 * A published hosted page by its slug, sanitized and ready to render. Password-protected
 * pages come back `locked` unless this visitor has unlocked them. Null when the page doesn't
 * exist; "unavailable" when the database can't be reached. Cached per request.
 */
export const getPublicPage = cache(
  async (slug: string): Promise<PublicPage | null | "unavailable"> => {
    const supabase = getPublicSupabase();
    if (!supabase) return "unavailable";
    const { data, error } = await supabase.rpc("public_page", { p_slug: slug });
    if (error) return "unavailable";
    const page = toPage(data, false);
    if (!page || !(data as Record<string, unknown>).protected) return page;

    const secret = process.env.SCAN_HASH_SECRET;
    const token = (await cookies()).get(unlockCookieName(slug))?.value;
    const admin = getAdminSupabase();
    if (!secret || !admin || !isUnlocked(slug, token, secret)) return { ...page, locked: true };
    const full = await admin.rpc("protected_page", { p_slug: slug });
    if (full.error) return "unavailable";
    return toPage(full.data, false);
  },
);
