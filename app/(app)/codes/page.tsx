import { Eye, Plus, Rows3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/app/PageHeader";
import { withWorkspace } from "@/components/app/nav";
import { buttonClasses } from "@/components/ui/Button";
import { CodeList } from "@/features/dashboard/CodeList";
import { formatCount } from "@/features/dashboard/format";
import { ROLE_LABELS, workspaceLabel } from "@/features/teams/roles";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Codes · QuickQReate" };

export default async function CodesPage({ searchParams }: PageProps<"/codes">) {
  const params = await searchParams;
  const requested = typeof params.workspace === "string" ? params.workspace : null;
  const { supabase, user } = await requireUser(
    requested ? `/codes?workspace=${requested}` : "/codes",
  );
  const { data: workspaces } = await supabase.rpc("my_workspaces");
  const membership = workspaces?.find((w) => w.owner_id === requested) ?? null;
  // Members can read their teams' codes too, so always filter to the workspace shown.
  const ownerId = membership?.owner_id ?? user.id;
  const teamId = membership?.owner_id ?? null;
  const canEdit = !membership || membership.role === "editor";

  const [{ data: codes }, { data: folders }] = await Promise.all([
    supabase
      .from("qr_codes")
      .select("*")
      .eq("user_id", ownerId)
      .order("updated_at", { ascending: false }),
    supabase.from("folders").select("*").eq("user_id", ownerId).order("name"),
  ]);
  const list = codes ?? [];
  const totalScans = list.reduce((sum, c) => sum + c.scan_count, 0);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={membership ? `${workspaceLabel(membership)}’s codes` : "All codes"}
        description={
          <>
            {membership && <>{ROLE_LABELS[membership.role]} · </>}
            {formatCount(list.length)} {list.length === 1 ? "code" : "codes"} ·{" "}
            {formatCount(totalScans)} {totalScans === 1 ? "scan" : "scans"}
          </>
        }
        actions={
          canEdit && (
            <>
              <Link
                href={withWorkspace("/bulk", teamId)}
                className={buttonClasses("outline", "md")}
              >
                <Rows3 aria-hidden /> Bulk create
              </Link>
              <Link href={withWorkspace("/", teamId)} className={buttonClasses("primary", "md")}>
                <Plus aria-hidden /> Create code
              </Link>
            </>
          )
        }
      />

      {!canEdit && (
        <p className="flex items-center gap-2 rounded-control bg-surface-2 px-4 py-3 text-sm text-fg-muted">
          <Eye aria-hidden className="size-4 shrink-0" />
          You can view these codes and their analytics. Ask the owner to make you an editor to
          change them.
        </p>
      )}

      <CodeList
        key={ownerId}
        codes={list}
        folders={folders ?? []}
        ownerId={ownerId}
        canEdit={canEdit}
        newHref={withWorkspace("/", teamId)}
      />
    </div>
  );
}
