import { SUPABASE_URL } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Request headers passed on: byte ranges (audio and video seek with them) and revalidation. */
const FORWARD = ["range", "if-range", "if-none-match", "if-modified-since"];
/** Response headers that describe the hop to Supabase, not the file. */
const DROP = new Set(["connection", "keep-alive", "transfer-encoding", "content-encoding", "set-cookie"]);

/**
 * Hosted-page files and profile photos at the site's own address (spec 5.1): the file comes
 * straight from the Supabase project. A route rather than a rewrite, because Next keeps only the
 * upstream's headers on external rewrites and this one needs its own edge lifetime.
 */
async function passThrough(request: Request, path: string[]): Promise<Response> {
  if (!SUPABASE_URL) return new Response(null, { status: 404 });
  const headers = new Headers({ "accept-encoding": "identity" });
  for (const name of FORWARD) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const upstream = await fetch(
    `${SUPABASE_URL}/storage/v1/object/public/${path.map(encodeURIComponent).join("/")}`,
    { method: request.method, headers, redirect: "manual", cache: "no-store" },
  );

  const out = new Headers();
  upstream.headers.forEach((value, name) => {
    if (!DROP.has(name)) out.set(name, value);
  });
  // Uploads ask browsers to keep them for a year; Cloudflare keeps its copy only ten minutes, so
  // a removed photo or replaced file stops being served soon after (see the privacy page).
  out.set("Cloudflare-CDN-Cache-Control", "max-age=600");
  return new Response(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers: out,
  });
}

type Context = { params: Promise<{ path: string[] }> };

export async function GET(request: Request, { params }: Context) {
  return passThrough(request, (await params).path);
}

export async function HEAD(request: Request, { params }: Context) {
  return passThrough(request, (await params).path);
}
