const BASE = "http://quickqreate.invalid";

/**
 * Only same-site paths are allowed as post-auth destinations (no open redirects). The value is
 * resolved the way a browser would, so tricks like "/\evil.com" or a tab in "/%09/evil.com"
 * can't turn it into another site.
 */
export function safeNext(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next?.startsWith("/")) return fallback;
  try {
    const url = new URL(next, BASE);
    const path = `${url.pathname}${url.search}${url.hash}`;
    return url.origin === BASE && !path.startsWith("//") ? path : fallback;
  } catch {
    return fallback;
  }
}

const INVITE_TOKEN = /^[0-9a-f]{48}$/;

/**
 * Where a confirmed email link goes. A new account with a team invite waiting for its address
 * opens that invite instead of the default page, even when confirmed on another device.
 */
export function confirmDestination(
  next: string,
  type: string,
  pendingInvite: string | null,
): string {
  const confirmsSignup = type === "email" || type === "signup";
  return confirmsSignup &&
    next === "/dashboard" &&
    pendingInvite &&
    INVITE_TOKEN.test(pendingInvite)
    ? `/invite/${pendingInvite}`
    : next;
}
