import { type NextRequest } from "next/server";

import { isValidSlug } from "@/lib/dynamic/slug";
import { sendResponseEmailsLater } from "@/lib/email/response-emails";
import { rsvpErrors } from "@/lib/pages/responses";
import { closed, json, text, visitorPost } from "@/lib/pages/visitor-post";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getPublicPage } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

/** The places an event has left, for its RSVP form: `left` is null when there's no limit. */
export async function GET(_request: NextRequest, { params }: RouteContext<"/p/[slug]/rsvp">) {
  const { slug } = await params;
  if (!isValidSlug(slug)) return json({ error: "not_found" }, 404);
  const admin = getAdminSupabase();
  if (!admin) return json({ error: "unavailable" }, 503);
  const page = await getPublicPage(slug);
  if (page === "unavailable") return json({ error: "unavailable" }, 503);
  if (!page || page.locked || page.type !== "event" || !page.content.rsvp) {
    return json({ error: "not_found" }, 404);
  }
  const { data, error } = await admin.rpc("rsvp_places_left", { p_slug: slug });
  if (error) return json({ error: "unavailable" }, 503);
  return json({ left: data ?? null }, 200);
}

/**
 * An RSVP (spec item 33): one per email, three a day per visitor, and only while places are left.
 * The database locks the event while it counts, so two RSVPs can't both take the last places.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/p/[slug]/rsvp">) {
  const { slug } = await params;
  const post = await visitorPost(request, slug, "event");
  if (post instanceof Response) return post;
  if (!post.page.content.rsvp) return closed();

  const { body } = post;
  const input = {
    name: text(body.name),
    email: text(body.email),
    guests: typeof body.guests === "number" ? body.guests : Number.NaN,
    note: text(body.note),
  };
  // The database checks the places left; here, any count from 1 to 10 will do.
  if (Object.keys(rsvpErrors(input, null)).length) return json({ error: "bad_request" }, 400);
  const { data, error } = await post.admin.rpc("submit_rsvp", {
    p_slug: slug,
    p_name: input.name,
    p_email: input.email,
    p_guests: input.guests,
    p_note: input.note || null,
    p_visitor_hash: post.visitor.visitorHash,
  });
  if (error) return json({ error: "unavailable" }, 503);
  switch (data) {
    case "listed":
      sendResponseEmailsLater(post.admin, slug);
      return json({ ok: true }, 200);
    // The same answer as a new RSVP, so nobody can find out who's coming by trying emails.
    case "already":
      return json({ ok: true }, 200);
    case "limited":
      return json({ error: "limited" }, 429);
    case "invalid":
      return json({ error: "bad_request" }, 400);
    case "full": {
      const places = await post.admin.rpc("rsvp_places_left", { p_slug: slug });
      return json({ error: "full", left: places.data ?? 0 }, 409);
    }
    default:
      return closed();
  }
}
