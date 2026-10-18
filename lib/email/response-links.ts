import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import type { getAdminSupabase } from "@/lib/supabase/admin";

const purpose = (codeId: string, ownerId: string) => `response-emails-off:${codeId}:${ownerId}`;

/**
 * The signature in a response email's off link (ruling 7): only this server can make one, and
 * only for that code and its maker, so it stops working if the code moves to someone else.
 */
export function offToken(secret: string, codeId: string, ownerId: string): string {
  return createHmac("sha256", secret).update(purpose(codeId, ownerId)).digest("base64url");
}

export function isOffToken(
  secret: string,
  codeId: string,
  ownerId: string,
  token: string,
): boolean {
  const expected = Buffer.from(offToken(secret, codeId, ownerId));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** The page a person opens, and the address a mail app posts to for one-click unsubscribe. */
export function offLinks(siteUrl: string, secret: string, codeId: string, ownerId: string) {
  const query = `c=${codeId}&t=${offToken(secret, codeId, ownerId)}`;
  return {
    page: `${siteUrl}/email/responses-off?${query}`,
    oneClick: `${siteUrl}/email/responses-off/stop?${query}`,
  };
}

type Admin = NonNullable<ReturnType<typeof getAdminSupabase>>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The code an off link is for, when it was signed for that code and its current maker. */
export async function offLinkCode(
  admin: Admin,
  secret: string,
  code: string,
  token: string,
): Promise<{ id: string; name: string; on: boolean; ownerId: string } | null> {
  if (!UUID.test(code) || !token) return null;
  const { data } = await admin
    .from("qr_codes")
    .select("id, name, user_id, notify_responses")
    .eq("id", code)
    .maybeSingle();
  if (!data || !isOffToken(secret, data.id, data.user_id, token)) return null;
  return { id: data.id, name: data.name, on: data.notify_responses, ownerId: data.user_id };
}
