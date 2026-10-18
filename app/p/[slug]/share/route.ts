import { type NextRequest } from "next/server";

import { shareErrors } from "@/lib/pages/responses";
import { closed, json, text, visitorPost } from "@/lib/pages/visitor-post";

export const dynamic = "force-dynamic";

/**
 * "Share your details" from a Contact page (spec item 15). The database keeps at most three a
 * day per visitor per page (visitors are identified by a daily-salted hash, never their IP).
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/p/[slug]/share">) {
  const { slug } = await params;
  const post = await visitorPost(request, slug, "vcard");
  if (post instanceof Response) return post;
  if (!post.page.content.shareDetails) return closed();

  const { body } = post;
  const input = {
    name: text(body.name),
    phone: text(body.phone),
    email: text(body.email),
    note: text(body.note),
  };
  if (Object.keys(shareErrors(input)).length) return json({ error: "bad_request" }, 400);
  const { data, error } = await post.admin.rpc("submit_contact_share", {
    p_slug: slug,
    p_name: input.name,
    p_phone: input.phone || null,
    p_email: input.email || null,
    p_note: input.note || null,
    p_visitor_hash: post.visitor.visitorHash,
  });
  if (error) return json({ error: "unavailable" }, 503);
  return data ? json({ ok: true }, 200) : json({ error: "limited" }, 429);
}
