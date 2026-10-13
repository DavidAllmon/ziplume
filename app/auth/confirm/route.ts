import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { safeNext } from "@/features/auth/redirects";
import { SITE_URL } from "@/lib/env";
import { getServerSupabase } from "@/lib/supabase/server";

const TYPES: EmailOtpType[] = [
  "signup",
  "email",
  "recovery",
  "email_change",
  "invite",
  "magiclink",
];

/**
 * Links in QuickQReate's branded emails land here with a token hash. Verifying it on the
 * server works even when the email is opened on a different device than the one that signed up.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(
    searchParams.get("next"),
    type === "recovery" ? "/account/update-password" : "/dashboard",
  );

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await getServerSupabase();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, SITE_URL));
  }
  return NextResponse.redirect(new URL("/login?error=link", SITE_URL));
}
