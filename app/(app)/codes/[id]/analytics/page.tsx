import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { withWorkspace } from "@/components/app/nav";

import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AnalyticsView } from "@/features/analytics/AnalyticsView";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Analytics · QuickQReate" };

export default async function AnalyticsPage({
  params,
  searchParams,
}: PageProps<"/codes/[id]/analytics">) {
  const { id } = await params;
  const { workspace } = await searchParams;
  const { supabase, user } = await requireUser(`/codes/${id}/analytics`);
  const { data: code } = await supabase.from("qr_codes").select("*").eq("id", id).maybeSingle();
  if (!code) notFound();
  // A teammate's code opens inside that team, so the sidebar and Create stay in their codes.
  if (code.user_id !== user.id && workspace !== code.user_id) {
    redirect(withWorkspace(`/codes/${id}/analytics`, code.user_id));
  }

  if (!code.is_dynamic) {
    return (
      <Card className="mx-auto flex max-w-xl flex-col items-center gap-3 px-6 py-12 text-center">
        <h1 className="font-display text-2xl font-bold tracking-tight text-fg">
          No analytics for static codes
        </h1>
        <p className="text-fg-muted">
          “{code.name}” encodes its content directly, so scans never pass through QuickQReate.
          Create a trackable Link code to see scans and change where it points later.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href={`/codes/${code.id}`} className={buttonClasses("outline", "md")}>
            Back to code
          </Link>
          <Link href="/codes/new?type=url" className={buttonClasses("primary", "md")}>
            Create a trackable code
          </Link>
        </div>
      </Card>
    );
  }

  return <AnalyticsView code={code} />;
}
