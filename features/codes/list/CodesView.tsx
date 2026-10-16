"use client";

import { FolderOpen, Link2, ListChecks, Plus, Wifi } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { newCodeHref } from "@/components/app/nav";
import { Button, buttonClasses } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { deleteCodes, setCodesStatus } from "@/features/codes/api";
import { copyToMyCodes } from "@/features/codes/duplicate";
import { moveCodes } from "@/features/folders/api";
import { MoveDialog } from "@/features/folders/MoveDialog";
import { cn } from "@/lib/cn";
import type { TeamPerson } from "@/lib/teams/access";
import type { FolderRow, QrCodeRow } from "@/types/supabase";

import { CodeRow, LIST_COLUMNS } from "./CodeRow";
import { CodeTile } from "./CodeTile";
import { downloadPng } from "./download";
import { announceCodesChanged } from "./events";
import {
  filterCodes,
  NO_FILTERS,
  sortCodes,
  typesIn,
  type ListFilters,
  type SortKey,
} from "./filters";
import { SelectionBar } from "./SelectionBar";
import { Toolbar } from "./Toolbar";
import { useListView } from "./useListView";

/** Bulk changes go out in batches this size (keeps each request's URL short). */
const BATCH = 100;

const QUICK_STARTS = [
  { type: "url", label: "Link", hint: "Open a website", icon: Link2 },
  { type: "wifi", label: "Wi-Fi", hint: "Join a network", icon: Wifi },
  { type: "links", label: "Link list", hint: "Several links on one page", icon: ListChecks },
] as const;

interface CodesViewProps {
  userId: string;
  codes: QrCodeRow[];
  /** The folders of the people shown; a code moves only into its own maker's. */
  folders: FolderRow[];
  /** The folder being shown, or null for all codes. */
  folder: FolderRow | null;
  /** Whose codes: your own, one teammate's, or everyone's in the team. */
  scope: "self" | "person" | "everyone";
  /** Owners and editors may change teammates' codes; viewers change only their own. */
  canEditOthers: boolean;
  /** Everyone in the team (empty on your own), for "Created by" and the Private label. */
  team: TeamPerson[];
  /** Scans in the last 30 days, by code id. */
  recentScans: Record<string, number>;
}

/** The Codes list: search, filters, list or grid, selection and the bulk actions. */
export function CodesView({
  userId,
  codes: initialCodes,
  folders,
  folder,
  scope,
  canEditOthers,
  team,
  recentScans,
}: CodesViewProps) {
  const router = useRouter();
  const toast = useToast();
  const [codes, setCodes] = useState(initialCodes);
  const [filters, setFilters] = useState<ListFilters>(NO_FILTERS);
  const [sort, setSort] = useState<SortKey>("newest");
  const [view, setView] = useListView(userId);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [toDelete, setToDelete] = useState<QrCodeRow[] | null>(null);
  const [toMove, setToMove] = useState<QrCodeRow[] | null>(null);
  const [working, setWorking] = useState(false);
  /** A bulk change in progress, e.g. "Pausing 100 of 200…"; null when idle. */
  const [busy, setBusy] = useState<string | null>(null);

  const mine = (code: QrCodeRow) => code.user_id === userId;
  const canEdit = (code: QrCodeRow) => mine(code) || canEditOthers;
  /** A teammate's code opens inside their codes (?workspace=); yours needs nothing. */
  const workspaceOf = (code: QrCodeRow) => (mine(code) ? null : code.user_id);
  const inTeam = team.length > 0;
  const creatorOf = (code: QrCodeRow) =>
    scope === "everyone" ? (team.find((person) => person.userId === code.user_id) ?? null) : null;

  const visible = useMemo(
    () => sortCodes(filterCodes(codes, filters), sort, recentScans),
    [codes, filters, sort, recentScans],
  );
  const selected = codes.filter((code) => selectedIds.has(code.id));
  const allEditable = selected.every(canEdit);
  const oneOwner = new Set(selected.map((code) => code.user_id)).size === 1;
  const allVisibleSelected = visible.length > 0 && visible.every((c) => selectedIds.has(c.id));
  const filtered =
    filters.query.trim() !== "" || filters.type !== "all" || filters.status !== "all";

  function changed() {
    announceCodesChanged();
    router.refresh();
  }

  function select(code: QrCodeRow, on: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (on) next.add(code.id);
      else next.delete(code.id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const code of visible) {
        if (allVisibleSelected) next.delete(code.id);
        else next.add(code.id);
      }
      return next;
    });
  }

  async function setPaused(list: QrCodeRow[], paused: boolean) {
    const ids = list.filter((code) => code.is_dynamic).map((code) => code.id);
    if (ids.length === 0 || busy) return;
    const verb = paused ? "Pausing" : "Resuming";
    const updated = new Map<string, QrCodeRow>();
    let failed = 0;
    for (let start = 0; start < ids.length; start += BATCH) {
      const batch = ids.slice(start, start + BATCH);
      setBusy(`${verb} ${start + batch.length} of ${ids.length}…`);
      const result = await setCodesStatus(batch, paused ? "paused" : "active");
      if (result.ok) for (const code of result.value) updated.set(code.id, code);
      else failed += batch.length;
    }
    setBusy(null);
    setCodes((current) => current.map((code) => updated.get(code.id) ?? code));
    if (failed) toast(`${failed} ${failed === 1 ? "code" : "codes"} couldn’t be changed.`, "error");
    else if (updated.size === 1) {
      const name = [...updated.values()][0]!.name;
      toast(paused ? `Paused “${name}”` : `“${name}” is active again`);
    } else toast(paused ? `Paused ${updated.size} codes` : `Resumed ${updated.size} codes`);
    changed();
  }

  async function confirmDelete() {
    if (!toDelete || working) return;
    setWorking(true);
    const ids = toDelete.map((code) => code.id);
    const removed = new Set<string>();
    for (let start = 0; start < ids.length; start += BATCH) {
      const result = await deleteCodes(ids.slice(start, start + BATCH));
      if (result.ok) for (const id of result.value) removed.add(id);
    }
    setWorking(false);
    setCodes((current) => current.filter((code) => !removed.has(code.id)));
    setSelectedIds((current) => new Set([...current].filter((id) => !removed.has(id))));
    const failed = ids.length - removed.size;
    if (failed) toast(`${failed} ${failed === 1 ? "code" : "codes"} couldn’t be deleted.`, "error");
    else
      toast(
        removed.size === 1 ? `Deleted “${toDelete[0]!.name}”` : `Deleted ${removed.size} codes`,
      );
    setToDelete(null);
    changed();
  }

  async function confirmMove(folderId: string | null) {
    if (!toMove) return;
    setWorking(true);
    const ids = toMove.map((code) => code.id);
    const result = await moveCodes(ids, folderId);
    setWorking(false);
    if (!result.ok) return toast(result.error, "error");
    // In a folder view, codes moved elsewhere leave the list.
    setCodes((current) =>
      folder && folderId !== folder.id
        ? current.filter((code) => !ids.includes(code.id))
        : current.map((code) => (ids.includes(code.id) ? { ...code, folder_id: folderId } : code)),
    );
    const where = folderId
      ? `to “${folders.find((f) => f.id === folderId)?.name}”`
      : "out of its folder";
    toast(ids.length === 1 ? `Moved “${toMove[0]!.name}” ${where}` : `Moved ${ids.length} codes`);
    setToMove(null);
    changed();
  }

  async function duplicate(code: QrCodeRow) {
    // A teammate's code is copied into your own codes.
    const fromTeammate = !mine(code);
    const result = await copyToMyCodes(code, { fromTeammate });
    if (!result.ok) return toast(result.error, "error");
    // The copy joins the list when the list shows your codes: yours, or Everyone's.
    if (scope !== "person") setCodes((current) => [result.value, ...current]);
    toast(
      fromTeammate ? `Copied “${code.name}” to your codes` : `Duplicated as “${result.value.name}”`,
    );
    changed();
  }

  async function download(code: QrCodeRow) {
    try {
      await downloadPng(code);
    } catch {
      toast("The code couldn’t be downloaded. Please try again.", "error");
    }
  }

  const handlers = {
    onDuplicate: duplicate,
    onMove: setToMove,
    onToggleStatus: (code: QrCodeRow) => setPaused([code], code.status !== "paused"),
    onDelete: setToDelete,
    onDownload: download,
  };

  if (codes.length === 0) {
    return folder ? (
      <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-field-border px-6 py-14 text-center">
        <FolderOpen aria-hidden className="size-8 text-fg-muted" />
        <h2 className="text-lg font-semibold text-fg">This folder is empty</h2>
        <p className="max-w-md text-sm text-fg-muted">
          {scope === "self"
            ? "Create a code here, or use “Move to folder” on any code to add it."
            : "Codes added to this folder will show up here."}
        </p>
        {scope === "self" && (
          <Link
            href={newCodeHref({ folderId: folder.id, ownerId: null })}
            className={buttonClasses("outline", "md")}
          >
            <Plus aria-hidden /> Create a code here
          </Link>
        )}
      </div>
    ) : (
      <div className="flex flex-col items-center gap-4 rounded-card border border-dashed border-field-border px-6 py-12 text-center">
        <h2 className="text-lg font-semibold text-fg">
          {scope === "self" ? "Create your first QR code" : "No codes here yet"}
        </h2>
        {/* New codes go in your own space, so a teammate's empty list offers no create links. */}
        {scope === "self" ? (
          <>
            <p className="max-w-md text-sm text-fg-muted">
              Pick what it should open. You can change everything later.
            </p>
            <ul className="grid w-full max-w-xl gap-3 sm:grid-cols-3">
              {QUICK_STARTS.map(({ type, label, hint, icon: Icon }) => (
                <li key={type}>
                  <Link
                    href={newCodeHref({ type, ownerId: null })}
                    className="flex min-h-11 flex-col items-center gap-1 rounded-control border border-border bg-surface px-4 py-4 text-center focus-ring hover:bg-surface-2"
                  >
                    <Icon aria-hidden className="size-5 text-fg-muted" />
                    <span className="font-medium text-fg">{label}</span>
                    <span className="text-sm text-fg-muted">{hint}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link href={newCodeHref({ ownerId: null })} className={buttonClasses("outline", "md")}>
              <Plus aria-hidden /> Other types
            </Link>
          </>
        ) : (
          <p className="max-w-md text-sm text-fg-muted">Codes added here will show up for you.</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Toolbar
        filters={filters}
        onFilters={setFilters}
        sort={sort}
        onSort={setSort}
        view={view}
        onView={setView}
        types={typesIn(codes)}
      />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-fg-muted">
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 sm:min-h-0">
          <input
            type="checkbox"
            className="size-5 accent-primary"
            checked={allVisibleSelected}
            disabled={visible.length === 0}
            onChange={toggleAllVisible}
          />
          Select all shown
        </label>
        <span>
          {visible.length} {visible.length === 1 ? "code" : "codes"}
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <h2 className="text-lg font-semibold text-fg">No codes match</h2>
          <p className="text-sm text-fg-muted">Try a different search or filter.</p>
          {filtered && (
            <Button variant="outline" onClick={() => setFilters(NO_FILTERS)}>
              Clear filters
            </Button>
          )}
        </div>
      ) : view === "grid" ? (
        <ul
          aria-label="Codes"
          data-view="grid"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {visible.map((code) => (
            <CodeTile
              key={code.id}
              code={code}
              canEdit={canEdit(code)}
              teamId={workspaceOf(code)}
              creator={creatorOf(code)}
              isPrivate={inTeam && mine(code) && code.is_private}
              scans={recentScans[code.id] ?? 0}
              selected={selectedIds.has(code.id)}
              onSelect={select}
              {...handlers}
            />
          ))}
        </ul>
      ) : (
        <div className="rounded-card border border-border bg-surface">
          <div
            aria-hidden
            className={cn(
              "hidden gap-x-3 border-b border-border px-3 py-2 text-sm font-medium text-fg-muted md:grid",
              LIST_COLUMNS,
            )}
          >
            <span className="w-5" />
            <span className="w-10" />
            <span>Name</span>
            <span>Type</span>
            <span>Status</span>
            <span className="text-right">Scans (30 days)</span>
            <span>Updated</span>
            <span className="w-9" />
          </div>
          <ul aria-label="Codes" data-view="list">
            {visible.map((code) => (
              <CodeRow
                key={code.id}
                code={code}
                canEdit={canEdit(code)}
                teamId={workspaceOf(code)}
                creator={creatorOf(code)}
                isPrivate={inTeam && mine(code) && code.is_private}
                scans={recentScans[code.id] ?? 0}
                selected={selectedIds.has(code.id)}
                onSelect={select}
                {...handlers}
              />
            ))}
          </ul>
        </div>
      )}

      {selected.length > 0 && (
        <SelectionBar
          selected={selected}
          canEdit={allEditable}
          canMove={oneOwner}
          busy={busy}
          onMove={() => setToMove(selected)}
          onSetPaused={(paused) => void setPaused(selected, paused)}
          onDelete={() => setToDelete(selected)}
          onClear={() => setSelectedIds(new Set())}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={
          toDelete?.length === 1
            ? `Delete “${toDelete[0]!.name}”?`
            : `Delete ${toDelete?.length ?? 0} codes?`
        }
        description={
          toDelete?.some((code) => code.is_dynamic)
            ? "Trackable codes stop working and their scan history is deleted. Printed copies will show “not set up”."
            : "This removes the saved codes from your account. Downloaded copies keep working."
        }
        confirmLabel={`Delete ${toDelete?.length ?? 0} ${toDelete?.length === 1 ? "code" : "codes"}`}
        danger
        pending={working}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
      <MoveDialog
        open={toMove !== null}
        count={toMove?.length ?? 0}
        folders={folders.filter((f) => f.user_id === toMove?.[0]?.user_id)}
        current={
          toMove && toMove.every((code) => code.folder_id === toMove[0]?.folder_id)
            ? (toMove[0]?.folder_id ?? null)
            : null
        }
        pending={working}
        onMove={confirmMove}
        onClose={() => setToMove(null)}
      />
    </div>
  );
}
