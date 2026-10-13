import { isValidSlug } from "@/lib/dynamic/slug";
import { contactVcard } from "@/lib/pages/files";
import { getPublicPage } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

/** The contact page as a vCard for "Save contact". */
export async function GET(_request: Request, { params }: RouteContext<"/p/[slug]/contact.vcf">) {
  const { slug } = await params;
  const page = isValidSlug(slug) ? await getPublicPage(slug) : null;
  if (
    !page ||
    page === "unavailable" ||
    page.locked ||
    page.type !== "vcard" ||
    page.status !== "active"
  ) {
    return new Response("Not found", { status: 404 });
  }
  const name =
    [page.content.firstName, page.content.lastName]
      .join(" ")
      .trim()
      .replace(/[^\w -]+/g, "")
      .replace(/\s+/g, "-") || "contact";
  return new Response(contactVcard(page.content), {
    headers: {
      "content-type": "text/vcard; charset=utf-8",
      "content-disposition": `attachment; filename="${name.toLowerCase()}.vcf"`,
      "cache-control": "no-store",
    },
  });
}
