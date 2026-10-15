import { Eye, Plus, Rows3 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/app/PageHeader";
import { bulkCreateHref, newCodeHref } from "@/components/app/nav";
import { buttonClasses } from "@/components/ui/Button";
import { CodesView } from "@/features/codes/list/CodesView";
import { FolderActions } from "@/features/codes/list/FolderActions";
import { FolderSelect } from "@/features/codes/list/FolderSelect";
import { formatCount } from "@/features/dashboard/format";
import { requireUser } from "@/lib/auth/server";
import { accessTo, personLabel } from "@/lib/teams/access";
import { loadTeam } from "@/lib/teams/server";

export const metadata: Metadata = { title: "Codes" };

export default async function CodesPage({ searchParams }: PageProps<"/codes">) {
  const params = await searchParams;
  const requested = typeof params.workspace === "string" ? params.workspace : null;
  const folderParam = typeof params.folder === "string" ? params.folder : null;
  const { supabase, user } = await requireUser(
    requested ? `/codes?workspace=${requested}` : "/codes",
  );
  const team = await loadTeam(supabase);
  // Anyone who isn't a teammate (or no one asked for) shows your own codes.
  const access = (requested && accessTo(team, user.id, requested)) || {
    self: true,
    canEdit: true,
    person: null,
  };
  // Teammates can read each other's codes, so always filter to the person shown.
  const ownerId = access.person?.userId ?? user.id;
  const teamId = access.person?.userId ?? null;
  const canEdit = access.canEdit;
  const label = access.person ? personLabel(access.person) : null;

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
  const title = folder ? folder.name : label ? `${label}’s codes` : "All codes";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={
          <>
            {label && <>{canEdit ? "You can edit these" : "You can view these"} · </>}
            {formatCount(list.length)} {list.length === 1 ? "code" : "codes"} ·{" "}
            {formatCount(totalScans)} {totalScans === 1 ? "scan" : "scans"} in the last 30 days
          </>
        }
        actions={
          (access.self || (canEdit && folder)) && (
            <>
              {folder && canEdit && <FolderActions folder={folder} teamId={teamId} />}
              {/* New codes always go in your own space, so creating only shows there. */}
              {access.self && (
                <>
                  <Link
                    href={bulkCreateHref({ folderId: folder?.id, ownerId: null })}
                    className={buttonClasses("outline", "md")}
                  >
                    <Rows3 aria-hidden /> Bulk create
                  </Link>
                  <Link
                    href={newCodeHref({ folderId: folder?.id, ownerId: null })}
                    className={buttonClasses("primary", "md")}
                  >
                    <Plus aria-hidden /> Create code
                  </Link>
                </>
              )}
            </>
          )
        }
      />

      {!canEdit && (
        <p className="flex items-center gap-2 rounded-control bg-surface-2 px-4 py-3 text-sm text-fg-muted">
          <Eye aria-hidden className="size-4 shrink-0" />
          You can view {label}’s codes and their analytics. Your own codes are under My codes.
        </p>
      )}

      <FolderSelect
        folders={folders ?? []}
        current={folder?.id ?? null}
        ownerId={ownerId}
        teamId={teamId}
        canEdit={access.self}
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
