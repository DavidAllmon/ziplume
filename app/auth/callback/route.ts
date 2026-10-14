import { NextResponse, type NextRequest } from "next/server";

import { safeNext } from "@/features/auth/redirects";
import { googleJustLinked, googlePhotoOf } from "@/features/profile/googlePhoto";
import { SITE_URL } from "@/lib/env";
import { getServerSupabase } from "@/lib/supabase/server";

type ServerSupabase = Awaited<ReturnType<typeof getServerSupabase>>;

/**
 * When Google was just linked to an account without a photo, use the Google photo. New Google
 * accounts already get it at sign-up; an uploaded or removed photo is never touched.
 */
async function adoptGooglePhoto(supabase: ServerSupabase) {
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user || !googleJustLinked(user)) return;
  const photo = googlePhotoOf(user);
  if (!photo) return;
  await supabase
    .from("profiles")
    .update({ avatar_url: photo })
    .eq("id", user.id)
    .is("avatar_url", null);
}

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

  await adoptGooglePhoto(supabase);

  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const destination =
    aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2"
      ? `/login/verify?next=${encodeURIComponent(next)}`
      : next;
  return NextResponse.redirect(new URL(destination, SITE_URL));
}
