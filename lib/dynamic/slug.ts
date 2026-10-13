// Short-link endings for dynamic codes. Generated endings use an uppercase alphabet without
// look-alike characters (0/O, 1/I/L), so codes can be encoded in QR alphanumeric mode and
// read aloud without confusion.

import { SITE_URL } from "@/lib/env";

export const SLUG_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const SLUG_PATTERN = /^[A-Za-z0-9-]{3,40}$/;

export function generateSlug(length = 6): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  // 31 symbols: the modulo bias is negligible for short IDs that are checked for uniqueness.
  return Array.from(bytes, (b) => SLUG_ALPHABET[b % SLUG_ALPHABET.length]).join("");
}

export function isValidSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

/**
 * What a dynamic code encodes. Uppercase lets the QR use alphanumeric mode (fewer modules,
 * easier to scan); hosts are case-insensitive and the /R/ path is routed to /r/.
 */
export function dynamicPayload(slug: string, siteUrl: string = SITE_URL): string {
  return `${siteUrl}/r/${slug}`.toUpperCase();
}
