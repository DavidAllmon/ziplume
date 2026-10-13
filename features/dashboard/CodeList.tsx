"use client";

import { Download, FolderInput, FolderPlus, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button, buttonClasses } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Select, TextInput } from "@/components/ui/inputs";
import { PromptDialog } from "@/components/ui/PromptDialog";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useToast } from "@/components/ui/Toast";
import { deleteCode, duplicateCode, updateCode } from "@/features/codes/api";
import {
  createFolder,
  deleteFolder,
  MAX_FOLDER_NAME,
  moveCodes,
  renameFolder,
} from "@/features/folders/api";
import { MoveDialog } from "@/features/folders/MoveDialog";
import { cn } from "@/lib/cn";
import { saveBlob } from "@/lib/download";
import type { ExportFormat } from "@/lib/qr/types";
import type { FolderRow, QrCodeRow } from "@/types/supabase";

import { CodeCard } from "./CodeCard";
import { codePayload, codeRenderOptions, codeSummary } from "./codeRender";

type Filter = "all" | "dynamic" | "static" | "paused";
type Sort = "updated" | "scans" | "name";
/** "all", "unfiled" or a folder id. */
type FolderFilter = string;

const FILTERS = [
  { value: "all", label: "All" },
  { value: "dynamic", label: "Dynamic" },
  { value: "static", label: "Static" },
  { value: "paused", label: "Paused" },
] as const satisfies readonly { value: Filter; label: string }[];

const ZIP_FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "png", label: "PNG" },
  { value: "svg", label: "SVG" },
  { value: "pdf", label: "PDF" },
  { value: "eps", label: "EPS" },
];

interface CodeListProps {
  codes: QrCodeRow[];
  folders: FolderRow[];
  /** The workspace shown: your account, or a team owner's. */
  ownerId: string;
  canEdit: boolean;
  /** Where "New code" goes (keeps the workspace). */
  newHref: string;
}

/** The count inside a folder chip: muted, except on the selected (filled) chip. */
const countClass = (active: boolean) => (active ? "font-normal" : "font-normal text-fg-muted");

const chipClass = (active: boolean) =>
  cn(
    "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium focus-ring transition-colors",
    active
      ? "border-primary bg-primary text-primary-fg"
      : "border-border bg-surface text-fg hover:bg-surface-2",
  );

export function CodeList({
  codes: initialCodes,
  folders: initialFolders,
  ownerId,
  canEdit,
  newHref,
}: CodeListProps) {
  const router = useRouter();
  const toast = useToast();
  const [codes, setCodes] = useState(initialCodes);
  const [folders, setFolders] = useState(initialFolders);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("updated");
  const [folder, setFolder] = useState<FolderFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [zipFormat, setZipFormat] = useState<ExportFormat>("png");
  const [zipProgress, setZipProgress] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<QrCodeRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toMove, setToMove] = useState<QrCodeRow[] | null>(null);
  const [moving, setMoving] = useState(false);
  const [naming, setNaming] = useState<"new" | FolderRow | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<FolderRow | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);

  const folderNames = useMemo(() => new Map(folders.map((f) => [f.id, f.name])), [folders]);
  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const code of codes) {
      const key = code.folder_id ?? "unfiled";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [codes]);
  const currentFolder = folders.find((f) => f.id === folder) ?? null;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return codes
      .filter((c) => {
        if (folder === "unfiled" && c.folder_id) return false;
        if (folder !== "all" && folder !== "unfiled" && c.folder_id !== folder) return false;
        if (filter === "dynamic" && !c.is_dynamic) return false;
        if (filter === "static" && c.is_dynamic) return false;
        if (filter === "paused" && c.status !== "paused") return false;
        if (!q) return true;
        return [c.name, codeSummary(c), c.slug ?? ""].some((field) =>
          field.toLowerCase().includes(q),
        );
      })
      .sort((a, b) =>
        sort === "name"
          ? a.name.localeCompare(b.name)
          : sort === "scans"
            ? b.scan_count - a.scan_count
            : b.updated_at.localeCompare(a.updated_at),
      );
  }, [codes, query, filter, sort, folder]);

  const selectedCodes = codes.filter((c) => selected.has(c.id));
  const allVisibleSelected = visible.length > 0 && visible.every((c) => selected.has(c.id));

  function onSelect(code: QrCodeRow, on: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (on) next.add(code.id);
      else next.delete(code.id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected((current) => {
      const next = new Set(current);
      for (const code of visible) {
        if (allVisibleSelected) next.delete(code.id);
        else next.add(code.id);
      }
      return next;
    });
  }

  async function onDuplicate(code: QrCodeRow) {
    const result = await duplicateCode(code);
    if (!result.ok) return toast(result.error, "error");
    setCodes((current) => [result.value, ...current]);
    toast(`Duplicated as “${result.value.name}”`);
    router.refresh();
  }

  async function onToggleStatus(code: QrCodeRow) {
    const status = code.status === "paused" ? "active" : "paused";
    const result = await updateCode(code.id, { status });
    if (!result.ok) return toast(result.error, "error");
    setCodes((current) => current.map((c) => (c.id === code.id ? result.value : c)));
    toast(status === "paused" ? `Paused “${code.name}”` : `“${code.name}” is live again`);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    const result = await deleteCode(toDelete.id);
    setDeleting(false);
    if (!result.ok) return toast(result.error, "error");
    setCodes((current) => current.filter((c) => c.id !== toDelete.id));
    onSelect(toDelete, false);
    toast(`Deleted “${toDelete.name}”`);
    setToDelete(null);
    router.refresh();
  }

  async function confirmMove(folderId: string | null) {
    if (!toMove) return;
    setMoving(true);
    const ids = toMove.map((c) => c.id);
    const result = await moveCodes(ids, folderId);
    setMoving(false);
    if (!result.ok) return toast(result.error, "error");
    setCodes((current) =>
      current.map((c) => (ids.includes(c.id) ? { ...c, folder_id: folderId } : c)),
    );
    const where = folderId ? `to “${folderNames.get(folderId)}”` : "out of its folder";
    toast(ids.length === 1 ? `Moved “${toMove[0]!.name}” ${where}` : `Moved ${ids.length} codes`);
    setToMove(null);
    router.refresh();
  }

  async function saveFolderName(name: string): Promise<string | void> {
    if (naming === "new") {
      const result = await createFolder(ownerId, name);
      if (!result.ok) return result.error;
      setFolders((current) =>
        [...current, result.value].sort((a, b) => a.name.localeCompare(b.name)),
      );
      setFolder(result.value.id);
      toast(`Created “${result.value.name}”`);
    } else if (naming) {
      const result = await renameFolder(naming.id, name);
      if (!result.ok) return result.error;
      setFolders((current) =>
        current
          .map((f) => (f.id === naming.id ? result.value : f))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
      toast(`Renamed to “${result.value.name}”`);
    }
    setNaming(null);
    router.refresh();
  }

  async function confirmDeleteFolder() {
    if (!folderToDelete) return;
    setDeletingFolder(true);
    const result = await deleteFolder(folderToDelete.id);
    setDeletingFolder(false);
    if (!result.ok) return toast(result.error, "error");
    setFolders((current) => current.filter((f) => f.id !== folderToDelete.id));
    setCodes((current) =>
      current.map((c) => (c.folder_id === folderToDelete.id ? { ...c, folder_id: null } : c)),
    );
    setFolder("all");
    toast(`Deleted the folder “${folderToDelete.name}”`);
    setFolderToDelete(null);
    router.refresh();
  }

  async function downloadZip() {
    const entries = selectedCodes
      .filter((code) => codePayload(code))
      .map((code) => ({ label: code.name, options: codeRenderOptions(code, 1024) }));
    if (!entries.length) return;
    setZipProgress(`Preparing 0 of ${entries.length}…`);
    try {
      const { zipCodes } = await import("@/lib/qr/zip");
      const blob = await zipCodes(entries, zipFormat, (done) =>
        setZipProgress(`Preparing ${done} of ${entries.length}…`),
      );
      const date = new Date().toISOString().slice(0, 10);
      saveBlob(blob, `quickqreate-codes-${date}.zip`);
      toast(`Downloaded ${entries.length} ${entries.length === 1 ? "code" : "codes"}`);
    } catch {
      toast("The ZIP file couldn’t be made. Please try again.", "error");
    } finally {
      setZipProgress(null);
    }
  }

  if (codes.length === 0 && folders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-field-border px-6 py-14 text-center">
        <h2 className="font-display text-xl font-bold text-fg">No saved codes yet</h2>
        {canEdit ? (
          <>
            <p className="max-w-md text-fg-muted">
              Create a code, then press Save. Turn on “Dynamic link” for a Link code to change where
              it points later and see its scans here.
            </p>
            <Link href={newHref} className={buttonClasses("primary", "md")}>
              <Plus aria-hidden /> Create a code
            </Link>
          </>
        ) : (
          <p className="max-w-md text-fg-muted">Codes added to this workspace will show up here.</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div role="group" aria-label="Folders" className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={chipClass(folder === "all")}
            aria-pressed={folder === "all"}
            onClick={() => setFolder("all")}
          >
            All codes <span className={countClass(folder === "all")}>{codes.length}</span>
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              type="button"
              className={chipClass(folder === f.id)}
              aria-pressed={folder === f.id}
              onClick={() => setFolder(f.id)}
            >
              <span className="max-w-48 truncate">{f.name}</span>
              <span className={countClass(folder === f.id)}>{folderCounts.get(f.id) ?? 0}</span>
            </button>
          ))}
          {folders.length > 0 && (
            <button
              type="button"
              className={chipClass(folder === "unfiled")}
              aria-pressed={folder === "unfiled"}
              onClick={() => setFolder("unfiled")}
            >
              No folder{" "}
              <span className={countClass(folder === "unfiled")}>
                {folderCounts.get("unfiled") ?? 0}
              </span>
            </button>
          )}
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={() => setNaming("new")}>
              <FolderPlus aria-hidden /> New folder
            </Button>
          )}
        </div>
        {canEdit && currentFolder && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Button variant="outline" size="sm" onClick={() => setNaming(currentFolder)}>
              <Pencil aria-hidden /> Rename folder
            </Button>
            <Button variant="outline" size="sm" onClick={() => setFolderToDelete(currentFolder)}>
              <Trash2 aria-hidden /> Delete folder
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search codes</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-muted"
          />
          <TextInput
            type="search"
            placeholder="Search by name, link or content"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <SegmentedControl
          aria-label="Filter codes"
          value={filter}
          onChange={setFilter}
          options={FILTERS}
          className="md:w-80"
        />
        <label className="md:w-48">
          <span className="sr-only">Sort codes</span>
          <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="updated">Recently updated</option>
            <option value="scans">Most scanned</option>
            <option value="name">Name</option>
          </Select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-fg-muted">
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            className="size-4 accent-primary"
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
        <p className="py-10 text-center text-fg-muted">
          {codes.length === 0
            ? "No codes yet. Create one, then move it into a folder."
            : folder !== "all" && !query && filter === "all"
              ? "This folder is empty. Use “Move to folder” on a code to add it."
              : "No codes match. Try a different search or filter."}
        </p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((code) => (
            <CodeCard
              key={code.id}
              code={code}
              canEdit={canEdit}
              folderName={
                folder === "all" && code.folder_id
                  ? (folderNames.get(code.folder_id) ?? null)
                  : null
              }
              selected={selected.has(code.id)}
              onSelect={onSelect}
              onDuplicate={onDuplicate}
              onToggleStatus={onToggleStatus}
              onMove={(c) => setToMove([c])}
              onDelete={setToDelete}
            />
          ))}
        </ul>
      )}

      {selected.size > 0 && (
        <div
          role="region"
          aria-label="Selected codes"
          className="sticky bottom-24 z-30 flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface p-3 shadow-pop md:bottom-4"
        >
          <span className="px-1 text-sm font-semibold text-fg">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label>
              <span className="sr-only">ZIP file format</span>
              <Select
                value={zipFormat}
                onChange={(e) => setZipFormat(e.target.value as ExportFormat)}
                className="h-9 w-24 text-sm"
              >
                {ZIP_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </label>
            <Button size="sm" onClick={downloadZip} disabled={zipProgress !== null}>
              <Download aria-hidden />
              {zipProgress ?? "Download ZIP"}
            </Button>
            {canEdit && (
              <Button variant="outline" size="sm" onClick={() => setToMove(selectedCodes)}>
                <FolderInput aria-hidden /> Move
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelected(new Set())}
              aria-label="Clear selection"
            >
              <X aria-hidden /> Clear
            </Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete “${toDelete?.name ?? ""}”?`}
        description={
          toDelete?.is_dynamic
            ? "The short link stops working and its scan history is deleted. Printed copies of this code will show “not set up”."
            : "This removes the saved code from your account. Downloaded copies keep working."
        }
        confirmLabel="Delete"
        danger
        pending={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
      <MoveDialog
        open={toMove !== null}
        count={toMove?.length ?? 0}
        folders={folders}
        current={
          toMove && toMove.every((c) => c.folder_id === toMove[0]?.folder_id)
            ? (toMove[0]?.folder_id ?? null)
            : null
        }
        pending={moving}
        onMove={confirmMove}
        onClose={() => setToMove(null)}
      />
      <PromptDialog
        open={naming !== null}
        title={naming === "new" ? "New folder" : "Rename folder"}
        label="Folder name"
        initialValue={naming && naming !== "new" ? naming.name : ""}
        confirmLabel={naming === "new" ? "Create folder" : "Rename"}
        maxLength={MAX_FOLDER_NAME}
        onSubmit={saveFolderName}
        onClose={() => setNaming(null)}
      />
      <ConfirmDialog
        open={folderToDelete !== null}
        title={`Delete the folder “${folderToDelete?.name ?? ""}”?`}
        description="The codes in it aren’t deleted. They move out of the folder."
        confirmLabel="Delete folder"
        danger
        pending={deletingFolder}
        onConfirm={confirmDeleteFolder}
        onClose={() => setFolderToDelete(null)}
      />
    </div>
  );
}
