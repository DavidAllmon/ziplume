import { isValidSlug } from "@/lib/dynamic/slug";
import { SITE_URL } from "@/lib/env";
import { eventIcs } from "@/lib/pages/files";
import { getPublicPage } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

/** The event as an .ics file for "Add to calendar". */
export async function GET(_request: Request, { params }: RouteContext<"/p/[slug]/event.ics">) {
  const { slug } = await params;
  const page = isValidSlug(slug) ? await getPublicPage(slug) : null;
  if (!page || page === "unavailable" || page.type !== "event" || page.status !== "active") {
    return new Response("Not found", { status: 404 });
  }
  const ics = eventIcs(page.content, page.slug, `${SITE_URL}/p/${page.slug}`);
  if (!ics) return new Response("Not found", { status: 404 });
  return new Response(ics, {
    headers: {
      "content-type": "text/calendar; charset=utf-8",
      "content-disposition": `attachment; filename="event-${page.slug.toLowerCase()}.ics"`,
      "cache-control": "no-store",
    },
  });
}
