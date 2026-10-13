import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import type { Database } from "@/types/supabase";

/**
 * Server client acting as the signed-in user (their JWT from cookies), so row-level security
 * applies. Use getUser() — not the cookie session — to decide who the caller is.
 */
export async function getServerSupabase() {
  const cookieStore = await cookies();
  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) cookieStore.set(name, value, options);
        } catch {
          // Called from a Server Component, where cookies are read-only. The proxy refreshes
          // sessions on protected routes, so this is safe to ignore.
        }
      },
    },
  });
}

/** The verified current user, or null. Verifies the token with the Auth server. */
export async function getCurrentUser() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  return error ? null : data.user;
}
