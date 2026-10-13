import { accountsEnabled } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Liveness check for Coolify. Reports whether accounts are configured, never secrets. */
export function GET() {
  return Response.json({ ok: true, accounts: accountsEnabled });
}
