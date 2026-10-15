// Public configuration, inlined at build time. Accounts, dynamic codes and analytics turn on
// only when the Supabase project is configured; without it Ziplume is the static generator.

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
  /\/+$/,
  "",
);
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const accountsEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export const BUY_ME_A_COFFEE_URL = "https://buymeacoffee.com/davidallmon";
export const REPO_URL = "https://github.com/DavidAllmon/ziplume";

/** Short link a dynamic code encodes, e.g. https://ziplume.com/r/AB3X9Q */
export function shortLink(slug: string): string {
  return `${SITE_URL}/r/${slug}`;
}

/** Display form without the scheme, e.g. ziplume.com/r/AB3X9Q */
export function shortLinkLabel(slug: string): string {
  return shortLink(slug).replace(/^https?:\/\//, "");
}

/** A public Storage file at the site's own address, which passes it on to Supabase. */
export function publicFileUrl(bucket: string, path: string): string {
  return `${SITE_URL}/storage/v1/object/public/${bucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
}
