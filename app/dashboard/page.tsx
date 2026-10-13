import { Eye, Plus, Rows3, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { BuyMeACoffee } from "@/components/support/BuyMeACoffee";
import { buttonClasses } from "@/components/ui/Button";
import { CodeList } from "@/features/dashboard/CodeList";
import { formatCount } from "@/features/dashboard/format";
import { ROLE_LABELS, workspaceLabel } from "@/features/teams/roles";
import { requireUser } from "@/lib/auth/server";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "My codes · QuickQReate" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { supabase, user } = await requireUser("/dashboard");
  const params = await searchParams;
  const { data: workspaces } = await supabase.rpc("my_workspaces");
  const requested = typeof params.workspace === "string" ? params.workspace : null;
  const membership = workspaces?.find((w) => w.owner_id === requested) ?? null;
  // Members can read their teams' codes too, so always filter to the workspace shown.
  const ownerId = membership?.owner_id ?? user.id;
  const canEdit = !membership || membership.role === "editor";
  const query = membership ? `?workspace=${ownerId}` : "";

  const [{ data: codes }, { data: folders }] = await Promise.all([
    supabase
      .from("qr_codes")
      .select("*")
      .eq("user_id", ownerId)
      .order("updated_at", { ascending: false }),
    supabase.from("folders").select("*").eq("user_id", ownerId).order("name"),
  ]);
  const list = codes ?? [];
  const dynamicCount = list.filter((c) => c.is_dynamic).length;
  const totalScans = list.reduce((sum, c) => sum + c.scan_count, 0);

  return (
    <div className="flex flex-col gap-6">
      {workspaces && workspaces.length > 0 && (
        <nav aria-label="Workspaces" className="flex flex-wrap gap-2">
          {[
            { id: null, label: "My codes", href: "/dashboard" },
            ...workspaces.map((w) => ({
              id: w.owner_id,
              label: workspaceLabel(w),
              href: `/dashboard?workspace=${w.owner_id}`,
            })),
          ].map((item) => {
            const current = (membership?.owner_id ?? null) === item.id;
            return (
              <Link
                key={item.id ?? "mine"}
                href={item.href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 max-w-64 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium focus-ring",
                  current
                    ? "border-fg bg-fg text-bg"
                    : "border-border bg-surface text-fg hover:bg-surface-2",
                )}
              >
                {item.id && <Users aria-hidden className="size-4 shrink-0" />}
                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate font-display text-3xl font-bold tracking-tight text-fg">
            {membership ? `${workspaceLabel(membership)}’s codes` : "My codes"}
          </h1>
          <p className="mt-1 text-fg-muted">
            {membership && <>{ROLE_LABELS[membership.role]} · </>}
            {formatCount(list.length)} saved · {formatCount(dynamicCount)} dynamic ·{" "}
            {formatCount(totalScans)} total scans
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!membership && (
            <Link href="/dashboard/team" className={buttonClasses("ghost", "md")}>
              <Users aria-hidden /> Team
            </Link>
          )}
          {canEdit && (
            <Link href={`/bulk${query}`} className={buttonClasses("outline", "md")}>
              <Rows3 aria-hidden /> Bulk create
            </Link>
          )}
          {canEdit && (
            <Link href={`/${query}`} className={buttonClasses("primary", "md")}>
              <Plus aria-hidden /> New code
            </Link>
          )}
        </div>
      </div>

      {!canEdit && (
        <p className="flex items-center gap-2 rounded-control bg-surface-2 px-4 py-3 text-sm text-fg-muted">
          <Eye aria-hidden className="size-4 shrink-0" />
          You can view this workspace’s codes and analytics. Ask its owner to make you an editor to
          change them.
        </p>
      )}

      <CodeList
        key={ownerId}
        codes={list}
        folders={folders ?? []}
        ownerId={ownerId}
        canEdit={canEdit}
        newHref={`/${query}`}
      />
      <BuyMeACoffee variant="card" />
    </div>
  );
}
