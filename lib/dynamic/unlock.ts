import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

// After a visitor enters a code's password, a signed cookie remembers it for a while so
// reloading the page (or downloading its files) doesn't ask again.

export const UNLOCK_SECONDS = 12 * 60 * 60;

export const unlockCookieName = (slug: string) => `qq_unlock_${slug.toUpperCase()}`;

const sign = (payload: string, secret: string) =>
  createHmac("sha256", `unlock:${secret}`).update(payload).digest("base64url");

export function unlockToken(slug: string, secret: string, now = Date.now()): string {
  const expires = Math.floor(now / 1000) + UNLOCK_SECONDS;
  return `${expires}.${sign(`${slug.toUpperCase()}.${expires}`, secret)}`;
}

export function isUnlocked(
  slug: string,
  token: string | undefined,
  secret: string,
  now = Date.now(),
): boolean {
  if (!token) return false;
  const [expires, signature] = token.split(".");
  if (!expires || !signature || !/^\d+$/.test(expires) || Number(expires) * 1000 < now)
    return false;
  const expected = Buffer.from(sign(`${slug.toUpperCase()}.${expires}`, secret));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Simple in-memory limiter for password attempts (one app instance is assumed). */
const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function tooManyAttempts(key: string, now = Date.now()): boolean {
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    if (attempts.size > 10_000) {
      for (const [k, v] of attempts) if (v.resetAt < now) attempts.delete(k);
    }
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_ATTEMPTS;
}
