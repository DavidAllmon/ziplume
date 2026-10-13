import "server-only";

import { notFound, redirect } from "next/navigation";

import { accountsEnabled } from "@/lib/env";
import { getServerSupabase } from "@/lib/supabase/server";

/**
 * The signed-in user and a client acting as them. `needsMfa` is true when the account has
 * two-factor authentication and this session hasn't completed it yet.
 */
export async function getAuthState() {
  const supabase = await getServerSupabase();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null, needsMfa: false };
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  return {
    supabase,
    user: data.user,
    needsMfa: aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2",
  };
}

/**
 * For protected pages: returns the verified user and a client acting as them, or redirects
 * to sign-in (or to the two-factor step when the account requires it).
 */
export async function requireUser(next: string) {
  if (!accountsEnabled) notFound();
  const { supabase, user, needsMfa } = await getAuthState();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (needsMfa) redirect(`/login/verify?next=${encodeURIComponent(next)}`);
  return { supabase, user };
}
