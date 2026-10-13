import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BuyMeACoffee } from "@/components/support/BuyMeACoffee";
import { buttonClasses } from "@/components/ui/Button";
import { CodeList } from "@/features/dashboard/CodeList";
import { formatCount } from "@/features/dashboard/format";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "My codes · QuickQReate" };

export default async function DashboardPage() {
  const { supabase } = await requireUser("/dashboard");
  const { data: codes } = await supabase
    .from("qr_codes")
    .select("*")
    .order("updated_at", { ascending: false });
  const list = codes ?? [];
  const dynamicCount = list.filter((c) => c.is_dynamic).length;
  const totalScans = list.reduce((sum, c) => sum + c.scan_count, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-fg">My codes</h1>
          <p className="mt-1 text-fg-muted">
            {formatCount(list.length)} saved · {formatCount(dynamicCount)} dynamic ·{" "}
            {formatCount(totalScans)} total scans
          </p>
        </div>
        <Link href="/" className={buttonClasses("primary", "md")}>
          <Plus aria-hidden /> New code
        </Link>
      </div>
      <CodeList codes={list} />
      <BuyMeACoffee variant="card" />
    </div>
  );
}
