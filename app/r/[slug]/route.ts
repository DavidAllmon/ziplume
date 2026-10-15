import { NextResponse, type NextRequest } from "next/server";

import { scanContext } from "@/lib/dynamic/scan-context";
import { isValidSlug } from "@/lib/dynamic/slug";
import { passwordPage, statusPage } from "@/lib/dynamic/status-page";
import { scanTarget } from "@/lib/dynamic/target";
import {
  isUnlocked,
  tooManyAttempts,
  UNLOCK_SECONDS,
  unlockCookieName,
  unlockToken,
} from "@/lib/dynamic/unlock";
import { SITE_URL } from "@/lib/env";
import { siteFor } from "@/lib/hosts";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { CodeState } from "@/types/supabase";

export const dynamic = "force-dynamic";

const NOT_FOUND = () =>
  statusPage(
    404,
    "This QR code isn't set up",
    "The link may have been mistyped, or its owner deleted it.",
  );

const UNAVAILABLE = () =>
  statusPage(
    503,
    "Temporarily unavailable",
    "This QR code can't be opened right now. Please try again shortly.",
  );

/** Pages for codes that can't be opened right now, or null when the code is active. */
function stateResponse(state: CodeState): Response | null {
  switch (state) {
    case "paused":
      return statusPage(
        410,
        "This QR code is paused",
        "Its owner has paused it for now. Try again later.",
      );
    case "scheduled":
      return statusPage(
        403,
        "This QR code isn't active yet",
        "It hasn't started yet. Please try again later.",
      );
    case "expired":
      return statusPage(
        410,
        "This QR code has expired",
        "Its owner set it to stop working after a certain date.",
      );
    default:
      return null;
  }
}

function redirect(target: string, status: 302 | 303 = 302) {
  const response = NextResponse.redirect(target, status);
  response.headers.set("cache-control", "no-store");
  return response;
}

/** Dynamic QR codes point here: record the scan, then send the visitor on. */
export async function GET(request: NextRequest, { params }: RouteContext<"/r/[slug]">) {
  const { slug } = await params;
  if (!isValidSlug(slug)) return NOT_FOUND();

  const admin = getAdminSupabase();
  const secret = process.env.SCAN_HASH_SECRET;
  if (!admin || !secret) return UNAVAILABLE();

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
    return UNAVAILABLE();
  }

  const code = data?.[0];
  if (!code) return NOT_FOUND();
  const blocked = stateResponse(code.status);
  if (blocked) return blocked;
  if (
    code.protected &&
    !isUnlocked(slug, request.cookies.get(unlockCookieName(slug))?.value, secret)
  ) {
    return passwordPage(slug);
  }

  // On an old address, hosted pages open there too, so an unlock cookie and the page agree.
  const target = scanTarget(code, slug, scan.os, siteFor(request.headers.get("host")));
  return target ? redirect(target) : NOT_FOUND();
}

/** The password form on protected codes posts here. */
export async function POST(request: NextRequest, { params }: RouteContext<"/r/[slug]">) {
  const { slug } = await params;
  if (!isValidSlug(slug)) return NOT_FOUND();

  const admin = getAdminSupabase();
  const secret = process.env.SCAN_HASH_SECRET;
  if (!admin || !secret) return UNAVAILABLE();

  const scan = scanContext(request.headers, secret);
  if (tooManyAttempts(`${scan.visitorHash}:${slug.toUpperCase()}`)) {
    return passwordPage(slug, "Too many attempts. Please wait a few minutes and try again.", 429);
  }

  let password = "";
  try {
    password = String((await request.formData()).get("password") ?? "").slice(0, 128);
  } catch {
    return passwordPage(slug, "Enter the password.", 400);
  }

  const { data: ok, error } = await admin.rpc("check_code_password", {
    p_slug: slug,
    p_password: password,
  });
  if (error) return UNAVAILABLE();
  if (!ok) return passwordPage(slug, "That password isn't right.", 401);

  // Look the code up again without counting another scan.
  const { data } = await admin.rpc("record_scan", {
    p_slug: slug,
    p_visitor_hash: scan.visitorHash,
    p_record: false,
  });
  const code = data?.[0];
  if (!code) return NOT_FOUND();
  const blocked = stateResponse(code.status);
  if (blocked) return blocked;
  const target = scanTarget(code, slug, scan.os, siteFor(request.headers.get("host")));
  if (!target) return NOT_FOUND();

  const response = redirect(target, 303);
  response.cookies.set(unlockCookieName(slug), unlockToken(slug, secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: SITE_URL.startsWith("https://"),
    path: "/",
    maxAge: UNLOCK_SECONDS,
  });
  return response;
}
