import "server-only";

import { NextResponse, type NextRequest } from "next/server";

import { scanContext, type ScanContext } from "@/lib/dynamic/scan-context";
import { isValidSlug } from "@/lib/dynamic/slug";
import { isOwnOrigin } from "@/lib/hosts";
import type { PageTypeId } from "@/lib/qr/types";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getPublicPage, type PublicPage } from "@/lib/supabase/public";

export const json = (body: unknown, status: number) =>
  NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });

/** A visitor's text field, trimmed; anything that isn't text is empty. */
export const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** A form turned off (or a page paused, which reads as off) after the visitor opened it. */
export const closed = () => json({ error: "closed" }, 409);

export interface VisitorPost<K extends PageTypeId> {
  page: Extract<PublicPage, { type: K }>;
  body: Record<string, unknown>;
  admin: NonNullable<ReturnType<typeof getAdminSupabase>>;
  visitor: ScanContext;
  secret: string;
}

/**
 * The checks each visitor form's post shares, as feedback's do:
 * - it comes from our own pages (the site's address, or the old address a printed code opens);
 * - it's a JSON object;
 * - the honeypot is empty;
 * - the page is of the right type, and unlocked if it has a password.
 * The honeypot gets a quiet success, so it learns nothing. Unlike scans, there's no bot check:
 * its pattern matches chat apps' own browsers (Telegram on Android names itself), whose visitors
 * would lose what they sent, and crawlers don't post forms. Returns the response to send when
 * one of these settles it.
 */
export async function visitorPost<K extends PageTypeId>(
  request: NextRequest,
  slug: string,
  type: K,
): Promise<VisitorPost<K> | NextResponse> {
  if (!isValidSlug(slug)) return json({ error: "not_found" }, 404);
  const origin = request.headers.get("origin");
  if (origin && !isOwnOrigin(origin, request.headers.get("host"))) {
    return json({ error: "forbidden" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("bad body");
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  // The hidden "website" field is a honeypot.
  if (typeof body.website === "string" && body.website.trim()) return json({ ok: true }, 200);

  const admin = getAdminSupabase();
  const secret = process.env.SCAN_HASH_SECRET;
  if (!admin || !secret) return json({ error: "unavailable" }, 503);
  const page = await getPublicPage(slug);
  if (page === "unavailable") return json({ error: "unavailable" }, 503);
  if (!page) return json({ error: "not_found" }, 404);
  if (page.locked) return json({ error: "locked" }, 403);
  if (page.type !== type) return json({ error: "not_found" }, 404);

  const visitor = scanContext(request.headers, secret);
  return { page: page as Extract<PublicPage, { type: K }>, body, admin, visitor, secret };
}
