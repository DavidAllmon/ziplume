import { createHash } from "node:crypto";

import { type NextRequest } from "next/server";

import { closed, json, visitorPost } from "@/lib/pages/visitor-post";

export const dynamic = "force-dynamic";

/**
 * "Mark as used" on a coupon (spec item 29, ruling 1): once per phone, by the random ID the
 * phone keeps for this coupon. Only a one-way hash of the ID is stored, tied to the coupon.
 */
export async function POST(request: NextRequest, { params }: RouteContext<"/p/[slug]/redeem">) {
  const { slug } = await params;
  const post = await visitorPost(request, slug, "coupon");
  if (post instanceof Response) return post;
  if (!post.page.content.markUsed) return closed();

  const phone = post.body.phone;
  if (typeof phone !== "string" || !/^[0-9a-f]{32}$/.test(phone)) {
    return json({ error: "bad_request" }, 400);
  }
  const phoneHash = createHash("sha256")
    .update(`${post.secret}:coupon:${slug.toUpperCase()}:${phone}`)
    .digest("hex");
  const { data, error } = await post.admin.rpc("record_coupon_use", {
    p_slug: slug,
    p_phone_hash: phoneHash,
    p_visitor_hash: post.visitor.visitorHash,
  });
  if (error) return json({ error: "unavailable" }, 503);
  if (data === "used" || data === "already") {
    return json({ ok: true, already: data === "already" }, 200);
  }
  if (data === "limited") return json({ error: "limited" }, 429);
  return json({ error: "closed" }, 409);
}
