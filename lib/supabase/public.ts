import "server-only";

import { createClient } from "@supabase/supabase-js";
import { cache } from "react";

import { SUPABASE_ANON_KEY, SUPABASE_URL, accountsEnabled } from "@/lib/env";
import { sanitizePage } from "@/lib/pages/sanitize";
import type { PageContentMap } from "@/lib/pages/types";
import { isPageType, type PageTypeId } from "@/lib/qr/types";
import type { Database } from "@/types/supabase";

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
    status: "active" | "paused";
    content: PageContentMap[K];
    updatedAt: string;
  };
}[PageTypeId];

/**
 * A published hosted page by its slug, sanitized and ready to render. Null when it doesn't
 * exist; "unavailable" when the database can't be reached. Cached per request.
 */
export const getPublicPage = cache(
  async (slug: string): Promise<PublicPage | null | "unavailable"> => {
    const supabase = getPublicSupabase();
    if (!supabase) return "unavailable";
    const { data, error } = await supabase.rpc("public_page", { p_slug: slug });
    if (error) return "unavailable";
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    const row = data as Record<string, unknown>;
    const type = String(row.qr_type);
    if (!isPageType(type)) return null;
    return {
      slug: String(row.slug),
      type,
      status: row.status === "paused" ? "paused" : "active",
      content: sanitizePage(type, row.content),
      updatedAt: String(row.updated_at ?? ""),
    } as PublicPage;
  },
);
