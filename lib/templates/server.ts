import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sanitizeDesign } from "@/features/generator/state/sanitize";
import type { DesignState } from "@/features/generator/state/types";
import type { Database } from "@/types/supabase";

/**
 * The design a person's new codes start from (redesign spec 4.2): their default template, cleaned
 * like any saved design; null without one, which means Classic.
 */
export async function defaultDesign(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<DesignState | null> {
  const { data } = await supabase
    .from("design_templates")
    .select("design")
    .eq("user_id", userId)
    .eq("is_default", true)
    .maybeSingle();
  return data ? sanitizeDesign(data.design) : null;
}
