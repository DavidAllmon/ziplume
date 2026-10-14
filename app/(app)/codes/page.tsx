import { Eye, Plus, Rows3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/app/PageHeader";
import { withWorkspace } from "@/components/app/nav";
import { buttonClasses } from "@/components/ui/Button";
import { CodesView } from "@/features/codes/list/CodesView";
import { FolderActions } from "@/features/codes/list/FolderActions";
import { FolderSelect } from "@/features/codes/list/FolderSelect";
import { formatCount } from "@/features/dashboard/format";
import { ROLE_LABELS, workspaceLabel } from "@/features/teams/roles";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Codes · QuickQReate" };

export default async function CodesPage({ searchParams }: PageProps<"/codes">) {
  const params = await searchParams;
  const requested = typeof params.workspace === "string" ? params.workspace : null;
  const folderParam = typeof params.folder === "string" ? params.folder : null;
  const { supabase, user } = await requireUser(
    requested ? `/codes?workspace=${requested}` : "/codes",
  );
  const { data: workspaces } = await supabase.rpc("my_workspaces");
  const membership = workspaces?.find((w) => w.owner_id === requested) ?? null;
  // Members can read their teams' codes too, so always filter to the workspace shown.
  const ownerId = membership?.owner_id ?? user.id;
  const teamId = membership?.owner_id ?? null;
  const canEdit = !membership || membership.role === "editor";

  const { data: folders } = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", ownerId)
    .order("name");
  // Only a folder of this workspace counts; anything else shows all codes.
  const folder = (folders ?? []).find((f) => f.id === folderParam) ?? null;
  let query = supabase
    .from("qr_codes")
    .select("*")
    .eq("user_id", ownerId)
    .order("updated_at", { ascending: false });
  if (folder) query = query.eq("folder_id", folder.id);
  const [{ data: codes }, { data: scans }] = await Promise.all([
    query,
    supabase.rpc("recent_scan_counts", { p_owner: ownerId }),
  ]);
  const list = codes ?? [];
  const recentScans = Object.fromEntries(
    (scans ?? []).map((row) => [row.code_id, Number(row.scans)]),
  );
  const totalScans = list.reduce((sum, code) => sum + (recentScans[code.id] ?? 0), 0);
  const title = folder
    ? folder.name
    : membership
      ? `${workspaceLabel(membership)}’s codes`
      : "All codes";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={
          <>
            {membership && <>{ROLE_LABELS[membership.role]} · </>}
            {formatCount(list.length)} {list.length === 1 ? "code" : "codes"} ·{" "}
            {formatCount(totalScans)} {totalScans === 1 ? "scan" : "scans"} in the last 30 days
          </>
        }
        actions={
          canEdit && (
            <>
              {folder && <FolderActions folder={folder} teamId={teamId} />}
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

      <FolderSelect
        folders={folders ?? []}
        current={folder?.id ?? null}
        ownerId={ownerId}
        teamId={teamId}
        canEdit={canEdit}
      />

      <CodesView
        key={`${ownerId}:${folder?.id ?? "all"}`}
        userId={user.id}
        codes={list}
        folders={folders ?? []}
        folder={folder}
        ownerId={ownerId}
        teamId={teamId}
        canEdit={canEdit}
        recentScans={recentScans}
      />
    </div>
  );
}
