import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { buttonClasses } from "@/components/ui/Button";
import { offLinkCode } from "@/lib/email/response-links";
import { getAdminSupabase } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Response emails", robots: { index: false } };

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-bg">
      <main className="grid flex-1 place-items-center px-4 py-10">
        <div className="flex max-w-md min-w-0 flex-col gap-4 rounded-[1.5rem] border border-border bg-surface p-8 text-center [overflow-wrap:anywhere] shadow-card">
          <h1 className="font-display text-xl font-bold text-fg">{title}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}

/**
 * The page a response email's off link opens (spec item 38, ruling 6). Opening it changes nothing,
 * because mail scanners open links; the button does it.
 */
export default async function ResponsesOffPage({
  searchParams,
}: PageProps<"/email/responses-off">) {
  const { c, t } = await searchParams;
  const code = typeof c === "string" ? c : "";
  const token = typeof t === "string" ? t : "";
  const admin = getAdminSupabase();
  const secret = process.env.SCAN_HASH_SECRET;
  const found = admin && secret ? await offLinkCode(admin, secret, code, token) : null;

  if (!found) {
    return (
      <Card title="This link doesn’t work">
        <p className="text-fg-muted">
          It may be from an older email. You can turn response emails off on the code’s page in
          Ziplume.
        </p>
      </Card>
    );
  }
  if (!found.on) {
    return (
      <Card title="Emails are off">
        <p className="text-fg-muted">
          You won’t get emails about new responses to “{found.name}”. To turn them back on, open the
          code in Ziplume.
        </p>
        <Link href={`/codes/${found.id}`} className={buttonClasses("outline")}>
          Open the code
        </Link>
      </Card>
    );
  }
  return (
    <Card title={`Stop emails for “${found.name}”?`}>
      <p className="text-fg-muted">
        You won’t be emailed when visitors send feedback, details or RSVPs from this code’s page.
        They’ll still appear on the code’s page.
      </p>
      <form
        method="post"
        action={`/email/responses-off/stop?c=${found.id}&t=${encodeURIComponent(token)}`}
      >
        <input type="hidden" name="from" value="page" />
        <button type="submit" className={buttonClasses("primary")}>
          Turn off emails
        </button>
      </form>
    </Card>
  );
}
