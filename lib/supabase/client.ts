"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL, accountsEnabled } from "@/lib/env";
import type { Database } from "@/types/supabase";

let client: SupabaseClient<Database> | null = null;

/** Browser client (anon key + the signed-in user's session). Null when accounts are off. */
export function getBrowserSupabase(): SupabaseClient<Database> | null {
  if (!accountsEnabled) return null;
  client ??= createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
