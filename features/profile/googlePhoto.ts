import type { User } from "@supabase/supabase-js";

const usable = (value: unknown): string | null =>
  typeof value === "string" && value.startsWith("https://") && value.length <= 2048 ? value : null;

/** The photo Google gave this account, when it signs in with Google. */
export function googlePhotoOf(user: Pick<User, "identities" | "user_metadata">): string | null {
  const google = user.identities?.find((identity) => identity.provider === "google");
  if (!google) return null;
  const data: Record<string, unknown> = google.identity_data ?? {};
  return (
    usable(data.avatar_url) ??
    usable(data.picture) ??
    usable(user.user_metadata?.avatar_url) ??
    usable(user.user_metadata?.picture)
  );
}

/**
 * True when this account's Google sign-in was added within the last minute: Google was just
 * linked. Signing in with Google later never counts, so a removed photo stays removed.
 */
export function googleJustLinked(user: Pick<User, "identities">, now = Date.now()): boolean {
  const google = user.identities?.find((identity) => identity.provider === "google");
  const added = google?.created_at ? Date.parse(google.created_at) : Number.NaN;
  return Number.isFinite(added) && Math.abs(now - added) < 60_000;
}
