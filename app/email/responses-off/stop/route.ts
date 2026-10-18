import { NextResponse, type NextRequest } from "next/server";

import { offLinkCode } from "@/lib/email/response-links";
import { SITE_URL } from "@/lib/env";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const reply = (body: string, status: number) =>
  new NextResponse(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });

/**
 * Turns off "Email me new responses" for one code: from the off page's button, or straight from a
 * mail app's one-click unsubscribe (RFC 8058), which posts here with no session. The signed link
 * is the permission.
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("c") ?? "";
  const token = url.searchParams.get("t") ?? "";
  const admin = getAdminSupabase();
  const secret = process.env.SCAN_HASH_SECRET;
  if (!admin || !secret) return reply("Email settings can’t be changed right now.", 503);
  const found = await offLinkCode(admin, secret, code, token);
  if (!found) return reply("This link doesn’t work.", 403);
  const { error } = await admin
    .from("qr_codes")
    .update({ notify_responses: false })
    .eq("id", found.id)
    .eq("user_id", found.ownerId);
  if (error) return reply("Email settings can’t be changed right now.", 503);
  const form = await request.formData().catch(() => null);
  if (form?.get("from") === "page") {
    return NextResponse.redirect(
      `${SITE_URL}/email/responses-off?c=${found.id}&t=${encodeURIComponent(token)}`,
      303,
    );
  }
  return reply("Emails about new responses are off.", 200);
}
