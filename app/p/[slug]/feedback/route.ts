import { NextResponse, type NextRequest } from "next/server";

import { scanContext } from "@/lib/dynamic/scan-context";
import { isValidSlug } from "@/lib/dynamic/slug";
import { isOwnOrigin } from "@/lib/hosts";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getPublicPage } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

const json = (body: unknown, status: number) =>
  NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });

/**
 * Receives a rating from a feedback page. The database keeps at most three responses per
 * visitor per code per day (visitors are identified by a daily-salted hash, never their IP).
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/p/[slug]/feedback">) {
  const { slug } = await params;
  if (!isValidSlug(slug)) return json({ error: "not_found" }, 404);

  // Only accept posts from our own pages: the site address, or the address this page was opened
  // on (an old printed code opens hosted pages on the old address).
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

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    return json({ error: "bad_request" }, 400);
  // The hidden "website" field is a honeypot: pretend success for bots that fill it in.
  if (typeof body.website === "string" && body.website.trim()) return json({ ok: true }, 200);

  const text = (value: unknown, max: number) =>
    typeof value === "string" ? value.trim().slice(0, max) : "";
  const admin = getAdminSupabase();
  const secret = process.env.SCAN_HASH_SECRET;
  if (!admin || !secret) return json({ error: "unavailable" }, 503);

  // Protected feedback pages only accept responses from visitors who unlocked them.
  const page = await getPublicPage(slug);
  if (!page || page === "unavailable") return json({ error: "not_found" }, 404);
  if (page.locked) return json({ error: "locked" }, 403);

  const visitor = scanContext(request.headers, secret);
  if (visitor.isBot) return json({ ok: true }, 200);
  const { data, error } = await admin.rpc("submit_feedback", {
    p_slug: slug,
    p_rating: rating,
    p_comment: text(body.comment, 2000) || null,
    p_contact: text(body.contact, 200) || null,
    p_visitor_hash: visitor.visitorHash,
  });
  if (error) return json({ error: "unavailable" }, 503);
  return data ? json({ ok: true }, 200) : json({ error: "limited" }, 429);
}
