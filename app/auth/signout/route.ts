import { NextResponse } from "next/server";

import { SITE_URL } from "@/lib/env";
import { getServerSupabase } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await getServerSupabase();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/", SITE_URL), { status: 303 });
}
