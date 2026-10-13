import { NextResponse, type NextRequest } from "next/server";

import { scanContext } from "@/lib/dynamic/scan-context";
import { scanTarget } from "@/lib/dynamic/target";
import { SITE_URL } from "@/lib/env";
import { isValidSlug } from "@/lib/dynamic/slug";
import { statusPage } from "@/lib/dynamic/status-page";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const NOT_FOUND = () =>
  statusPage(
    404,
    "This QR code isn't set up",
    "The link may have been mistyped, or its owner deleted it.",
  );

/** Dynamic QR codes point here: record the scan, then send the visitor on. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isValidSlug(slug)) return NOT_FOUND();

  const admin = getAdminSupabase();
  const secret = process.env.SCAN_HASH_SECRET;
  if (!admin || !secret) {
    return statusPage(
      503,
      "Temporarily unavailable",
      "This QR code can't be opened right now. Please try again shortly.",
    );
  }

  const scan = scanContext(request.headers, secret);
  const { data, error } = await admin.rpc("record_scan", {
    p_slug: slug,
    p_visitor_hash: scan.visitorHash,
    p_country: scan.country,
    p_region: scan.region,
    p_city: scan.city,
    p_device_type: scan.deviceType,
    p_os: scan.os,
    p_browser: scan.browser,
    p_record: !scan.isBot,
  });

  if (error) {
    console.error("record_scan failed", error.message);
    return statusPage(
      503,
      "Temporarily unavailable",
      "This QR code can't be opened right now. Please try again shortly.",
    );
  }

  const code = data?.[0];
  if (!code) return NOT_FOUND();
  if (code.status === "paused") {
    return statusPage(
      410,
      "This QR code is paused",
      "Its owner has paused it for now. Try again later.",
    );
  }

  const target = scanTarget(code, slug, scan.os, SITE_URL);
  if (!target) return NOT_FOUND();
  const response = NextResponse.redirect(target, 302);
  response.headers.set("cache-control", "no-store");
  return response;
}
