import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AnalyticsView } from "@/features/analytics/AnalyticsView";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Analytics · QuickQReate" };

export default async function AnalyticsPage({
  params,
}: PageProps<"/dashboard/codes/[id]/analytics">) {
  const { id } = await params;
  const { supabase } = await requireUser(`/dashboard/codes/${id}/analytics`);
  const { data: code } = await supabase.from("qr_codes").select("*").eq("id", id).maybeSingle();
  if (!code) notFound();

  if (!code.is_dynamic) {
    return (
      <Card className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-12 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
          No analytics for static codes
        </h1>
        <p className="text-fg-muted">
          “{code.name}” encodes its content directly, so scans never pass through QuickQReate. Make
          a new dynamic Link code to track scans and change where it points later.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href={`/dashboard/codes/${code.id}`} className={buttonClasses("outline", "md")}>
            Back to code
          </Link>
          <Link href="/" className={buttonClasses("primary", "md")}>
            New dynamic code
          </Link>
        </div>
      </Card>
    );
  }

  return <AnalyticsView code={code} />;
}
