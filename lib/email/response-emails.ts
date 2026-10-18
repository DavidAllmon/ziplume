import "server-only";

import { after } from "next/server";

import { responseEmail, type ResponseKind } from "@/emails/response";
import { SITE_URL } from "@/lib/env";
import type { getAdminSupabase } from "@/lib/supabase/admin";

import { emailConfigured, sendEmail } from "./brevo";
import { offLinks } from "./response-links";

type Admin = NonNullable<ReturnType<typeof getAdminSupabase>>;
type Env = Record<string, string | undefined>;

/**
 * Emails a page's maker what visitors just sent, when they've turned on "Email me new responses"
 * (spec item 38). The database queued each response and keeps the limits; this takes the page's
 * waiting emails once each and records whether Brevo took them. Never throws.
 */
export async function sendResponseEmails(
  admin: Admin,
  slug: string,
  { env = process.env, fetcher = fetch }: { env?: Env; fetcher?: typeof fetch } = {},
): Promise<number> {
  const secret = env.SCAN_HASH_SECRET;
  if (!emailConfigured(env) || !secret) return 0;
  const { data, error } = await admin.rpc("claim_response_emails", { p_slug: slug });
  if (error || !data) return 0;
  let sent = 0;
  for (const row of data) {
    const details =
      row.details && typeof row.details === "object" && !Array.isArray(row.details)
        ? (row.details as Record<string, unknown>)
        : null;
    let ok = false;
    if (details && row.to_email) {
      const links = offLinks(SITE_URL, secret, row.code_id, row.owner_id);
      const content = responseEmail({
        kind: row.kind as ResponseKind,
        codeName: row.code_name,
        details,
        receivedAt: row.received_at,
        codeUrl: `${SITE_URL}/codes/${row.code_id}`,
        offUrl: links.page,
      });
      const result = await sendEmail(
        {
          to: row.to_email,
          ...content,
          headers: {
            "List-Unsubscribe": `<${links.oneClick}>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        },
        { env, fetcher },
      );
      ok = result.ok;
      // The reason (never the key) helps the operator tell a wrong key from a blocked address.
      if (!result.ok) console.warn(`Response email failed: ${result.error}`);
    }
    if (ok) sent += 1;
    await admin.rpc("finish_response_email", { p_id: row.id, p_sent: ok });
  }
  return sent;
}

/** Sends a page's waiting response emails once the visitor has their answer (ruling 8). */
export function sendResponseEmailsLater(admin: Admin, slug: string): void {
  const task = () =>
    sendResponseEmails(admin, slug).then(
      () => undefined,
      () => undefined,
    );
  try {
    after(task);
  } catch {
    // Outside a request (a script): send now, without waiting.
    void task();
  }
}
