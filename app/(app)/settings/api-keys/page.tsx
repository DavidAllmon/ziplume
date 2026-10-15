import type { Metadata } from "next";
import Link from "next/link";

import { SettingsSection } from "@/components/app/SettingsSection";
import { ApiKeys } from "@/features/developer/ApiKeys";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "API keys · Settings" };

export default async function ApiKeySettingsPage() {
  const { supabase } = await requireUser("/settings/api-keys");
  const { data: keys } = await supabase
    .from("api_keys")
    .select("id, name, prefix, created_at, last_used_at")
    .order("created_at", { ascending: false });
  return (
    <SettingsSection id="api-keys" title="API keys" description="For developers. Up to 10 keys.">
      <div className="flex flex-col gap-4">
        <ApiKeys keys={keys ?? []} />
        <p className="text-sm text-fg-muted">
          See the{" "}
          <Link
            href="/developers"
            className="font-medium text-link underline-offset-4 hover:underline"
          >
            API docs
          </Link>{" "}
          for what you can do with a key.
        </p>
      </div>
    </SettingsSection>
  );
}
