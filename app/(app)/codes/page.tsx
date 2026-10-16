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
import { JoinedTip } from "@/features/teams/JoinedTip";
import { PeopleSwitch } from "@/features/teams/PeopleSwitch";
import { requireUser } from "@/lib/auth/server";
import { codesScope, personLabel } from "@/lib/teams/access";
import { loadTeam } from "@/lib/teams/server";

export const metadata: Metadata = { title: "Codes" };

export default async function CodesPage({ searchParams }: PageProps<"/codes">) {
  const params = await searchParams;
  const requested = typeof params.workspace === "string" ? params.workspace : null;
  const view = typeof params.view === "string" ? params.view : null;
  const folderParam = typeof params.folder === "string" ? params.folder : null;
  const { supabase, user } = await requireUser(
    requested
      ? `/codes?workspace=${requested}`
      : view === "everyone"
        ? "/codes?view=everyone"
        : "/codes",
  );
  const team = await loadTeam(supabase);
  // Someone you can't see, or Everyone while you're on your own, shows your own codes.
  const scope = codesScope(team, user.id, { workspace: requested, view });
  const person = scope.kind === "person" ? scope.person : null;
  const everyone = scope.kind === "everyone";
  const own = scope.kind === "self";
  const canEditOthers =
    scope.kind === "everyone"
      ? scope.canEditOthers
      : scope.kind === "person"
        ? scope.canEdit
        : true;
  const ownerId = person?.userId ?? user.id;
  // Teammates can read each other's codes, so always filter to the people shown.
  const owners = everyone ? team.map((p) => p.userId) : [ownerId];
  const label = person ? personLabel(person) : null;

  const { data: folders } = await supabase
    .from("folders")
    .select("*")
    .in("user_id", owners)
    .order("name");
  // Only a folder of the person shown counts; Everyone has none (folders belong to one person).
  const folder = everyone
    ? null
    : ((folders ?? []).find((f) => f.id === folderParam && f.user_id === ownerId) ?? null);
  let query = supabase
    .from("qr_codes")
    .select("*")
    .in("user_id", owners)
    .order("updated_at", { ascending: false });
  if (folder) query = query.eq("folder_id", folder.id);
  const [{ data: codes }, scanLists] = await Promise.all([
    query,
    Promise.all(owners.map((owner) => supabase.rpc("recent_scan_counts", { p_owner: owner }))),
  ]);
  const list = codes ?? [];
  const recentScans = Object.fromEntries(
    scanLists.flatMap(({ data }) => data ?? []).map((row) => [row.code_id, Number(row.scans)]),
  );
  const totalScans = list.reduce((sum, code) => sum + (recentScans[code.id] ?? 0), 0);
  const title = folder
    ? folder.name
    : everyone
      ? "Everyone’s codes"
      : label
        ? `${label}’s codes`
        : "All codes";
  const roleNote = everyone
    ? canEditOthers
      ? "You can edit these"
      : "You can view teammates’ codes and edit your own"
    : label
      ? canEditOthers
        ? "You can edit these"
        : "You can view these"
      : null;
  const teamOwner = team.find((p) => p.role === "owner" && !p.isMe) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={
          <>
            {roleNote && <>{roleNote} · </>}
            {formatCount(list.length)} {list.length === 1 ? "code" : "codes"} ·{" "}
            {formatCount(totalScans)} {totalScans === 1 ? "scan" : "scans"} in the last 30 days
          </>
        }
        actions={
          (own || everyone || (canEditOthers && folder)) && (
            <>
              {folder && canEditOthers && (
                <FolderActions folder={folder} teamId={person?.userId ?? null} />
              )}
              {/* New codes always go in your own space, so creating shows with your codes. */}
              {(own || everyone) && (
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

      {team.length > 0 && (
        <PeopleSwitch
          team={team}
          current={everyone ? "everyone" : person ? person.userId : "self"}
        />
      )}
      {params.joined === "1" && teamOwner && <JoinedTip ownerName={personLabel(teamOwner)} />}

      {person && !canEditOthers && (
        <p className="flex items-center gap-2 rounded-control bg-surface-2 px-4 py-3 text-sm text-fg-muted">
          <Eye aria-hidden className="size-4 shrink-0" />
          You can view {label}’s codes and their analytics. Your own codes are under My codes.
        </p>
      )}

      {!everyone && (
        <FolderSelect
          folders={folders ?? []}
          current={folder?.id ?? null}
          ownerId={ownerId}
          teamId={person?.userId ?? null}
          canEdit={own}
        />
      )}

      <CodesView
        key={`${scope.kind}:${ownerId}:${folder?.id ?? "all"}`}
        userId={user.id}
        codes={list}
        folders={folders ?? []}
        folder={folder}
        scope={scope.kind}
        canEditOthers={canEditOthers}
        team={team}
        recentScans={recentScans}
      />
    </div>
  );
}
