import { SITE_URL } from "@/lib/env";

// The address rules for the move to ziplume.com (spec 5.1). SITE_URL is the one true address.
// LEGACY_HOSTS, a runtime setting, lists old addresses that keep answering printed codes.

/** What an old address still serves itself: short links, hosted pages, the API and their files. */
const SERVED_DIRECTLY =
  /^\/(?:(?:r|R|p|api|_next|email-templates|brand|icons)(?:\/|$)|(?:sw\.js|favicon\.ico|icon\.svg|apple-icon\.png|manifest\.webmanifest|opengraph-image\.png|twitter-image\.png)$)/;

/** "QR.Example.com:443" → "qr.example.com"; "" when there is no host. */
export function normalizeHost(host: string | null | undefined): string {
  const value = (host ?? "").trim().toLowerCase();
  const name = value.startsWith("[")
    ? value.replace(/^(\[[^\]]*\]).*$/, "$1")
    : value.replace(/:\d*$/, "");
  return name.replace(/\.$/, "");
}

/** LEGACY_HOSTS: host names separated by commas or spaces. Schemes, ports and paths are ignored. */
export function parseLegacyHosts(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[\s,]+/)
    .map((entry) => normalizeHost(entry.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "").split("/")[0]))
    .filter(Boolean);
}

/** Read for each request, so changing the setting needs no rebuild. */
export function legacyHosts(): string[] {
  return parseLegacyHosts(process.env.LEGACY_HOSTS);
}

/**
 * Where a request should go instead, or null to handle it here. An old address serves short
 * links, hosted pages, the API and their files itself, and forwards everything else with its path
 * and query; www forwards everything. The canonical host is never forwarded, so a legacy list
 * that names it can't loop.
 */
export function legacyHostAction(
  host: string | null,
  pathname: string,
  search: string,
  config: { siteUrl: string; legacyHosts: readonly string[] },
): string | null {
  const name = normalizeHost(host);
  let site: URL;
  try {
    site = new URL(config.siteUrl);
  } catch {
    return null;
  }
  if (!name || name === site.hostname) return null;
  const forward = `${site.origin}${pathname}${search}`;
  if (name === `www.${site.hostname}`) return forward;
  if (!config.legacyHosts.includes(name) || SERVED_DIRECTLY.test(pathname)) return null;
  return forward;
}

/**
 * The address a scan sends visitors on to: the old address when the scan came in there, so a
 * password unlock and the hosted page share one host. The site address everywhere else.
 */
export function siteFor(
  host: string | null,
  siteUrl: string = SITE_URL,
  hosts: readonly string[] = legacyHosts(),
): string {
  const name = normalizeHost(host);
  return name && hosts.includes(name) ? `https://${name}` : siteUrl;
}

/**
 * Whether a browser's Origin is one of our own pages: the site address, or the host the request
 * came to (Next's own idea of the request's origin is the container's, not the public address).
 */
export function isOwnOrigin(
  origin: string,
  host: string | null,
  siteUrl: string = SITE_URL,
): boolean {
  let from: URL;
  try {
    from = new URL(origin);
  } catch {
    return false;
  }
  try {
    if (from.origin === new URL(siteUrl).origin) return true;
  } catch {
    // No site address: only the request's own host counts.
  }
  const own = normalizeHost(host);
  return own !== "" && normalizeHost(from.host) === own;
}
