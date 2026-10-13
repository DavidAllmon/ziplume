import { NextResponse, type NextRequest } from "next/server";

import { safeNext } from "@/features/auth/redirects";
import { SITE_URL } from "@/lib/env";
import { getServerSupabase } from "@/lib/supabase/server";

/** Finishes Google sign-in and PKCE email links: exchanges ?code= for a session cookie. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const next = safeNext(searchParams.get("next"));
  const code = searchParams.get("code");

  if (!code) {
    const reason = searchParams.get("error") ? "oauth" : "link";
    return NextResponse.redirect(
      new URL(`/login?error=${reason}&next=${encodeURIComponent(next)}`, SITE_URL),
    );
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(
      new URL(`/login?error=link&next=${encodeURIComponent(next)}`, SITE_URL),
    );
  }

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const destination =
    aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2"
      ? `/login/verify?next=${encodeURIComponent(next)}`
      : next;
  return NextResponse.redirect(new URL(destination, SITE_URL));
}
