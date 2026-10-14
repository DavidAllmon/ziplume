"use client";

import { CheckCircle2, Download, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { PageHeader } from "@/components/app/PageHeader";
import { withWorkspace } from "@/components/app/nav";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select, TextInput } from "@/components/ui/inputs";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import { createCodes } from "@/features/codes/api";
import { createFolder, MAX_FOLDER_NAME } from "@/features/folders/api";
import { DEFAULT_DESIGN } from "@/features/generator/state/defaults";
import { parseBulk, requireWebLinks, type BulkRow } from "@/lib/bulk/rows";
import { cn } from "@/lib/cn";
import { codeTypeInfo } from "@/lib/qr/code-types";
import type { ExportFormat, QrTypeId } from "@/lib/qr/types";
import type { FolderRow, QrCodeRow } from "@/types/supabase";

import { BulkCheckCard } from "./BulkCheckCard";
import { BulkListCard } from "./BulkListCard";
import { downloadZip, itemsFromCodes, ZIP_FORMATS } from "./zip";

const NEW_FOLDER = "__new__";
const codes = (n: number) => `${n} ${n === 1 ? "code" : "codes"}`;

export interface BulkCreatePageProps {
  /** The workspace the codes go into: yours, or a team owner's. */
  ownerId: string;
  /** The team owner's id when creating in a team; null for your own codes. */
  teamId: string | null;
  /** The team owner's name for the header; null for your own codes. */
  workspaceLabel: string | null;
  folders: FolderRow[];
  initialFolderId: string | null;
}

/** Bulk creation inside the app: every ready row becomes a code in your account or team. */
export function BulkCreatePage({
  ownerId,
  teamId,
  workspaceLabel,
  folders: initialFolders,
  initialFolderId,
}: BulkCreatePageProps) {
  const toast = useToast();
  const [type, setType] = useState<QrTypeId>("url");
  const [text, setText] = useState("");
  const [trackable, setTrackable] = useState(true);
  const [folders, setFolders] = useState(initialFolders);
  const [folderId, setFolderId] = useState(initialFolderId ?? "");
  const [newFolder, setNewFolder] = useState("");
  const [format, setFormat] = useState<ExportFormat>("png");
  /** "Creating 100 of 300…" while saving; null when idle. */
  const [creating, setCreating] = useState<string | null>(null);
  /** "Preparing 12 of 300…" while the ZIP is made; null when idle. */
  const [downloading, setDownloading] = useState<string | null>(null);
  /** Codes created from this list so far, and the folder they went into. */
  const [created, setCreated] = useState<QrCodeRow[]>([]);
  const [placedIn, setPlacedIn] = useState<string | null>(null);
  /** Rows not created yet after a save stopped partway; null when nothing is waiting. */
  const [remaining, setRemaining] = useState<BulkRow[] | null>(null);
  /** Set the moment Create is pressed, so a second press can't start another save. */
  const inFlight = useRef(false);

  const result = useMemo(
    () => (text.trim() ? parseBulk(type, text, DEFAULT_DESIGN.errorCorrection) : null),
    [type, text],
  );
  const asLinks = type === "url" && trackable;
  const rows = useMemo(
    () => (!result ? [] : asLinks ? requireWebLinks(result.rows) : result.rows),
    [result, asLinks],
  );
  const ready = rows.filter((row) => !row.error);
  const toCreate = remaining ?? ready;
  const finished = created.length > 0 && remaining === null;
  const placedName = folders.find((folder) => folder.id === placedIn)?.name ?? null;

  /** A different list, type or tracking choice starts a new batch. */
  function startOver() {
    setCreated([]);
    setRemaining(null);
    setPlacedIn(null);
  }

  /** The chosen folder's id: null for none, undefined when a new one couldn't be made. */
  async function resolveFolder(): Promise<string | null | undefined> {
    if (folderId !== NEW_FOLDER) return folderId || null;
    const name = newFolder.trim();
    if (!name) {
      toast("Name the new folder first.", "error");
      return undefined;
    }
    const made = await createFolder(ownerId, name);
    if (!made.ok) {
      toast(made.error, "error");
      return undefined;
    }
    setFolders((current) => [...current, made.value]);
    setFolderId(made.value.id);
    setNewFolder("");
    return made.value.id;
  }

  async function create() {
    if (inFlight.current || toCreate.length === 0) return;
    inFlight.current = true;
    const folder = await resolveFolder();
    if (folder === undefined) {
      inFlight.current = false;
      return;
    }
    const batch = toCreate;
    let reported = 0;
    setCreating(`Creating 0 of ${batch.length}…`);
    const answer = await createCodes(
      batch.map((row) => ({
        ownerId: teamId ?? undefined,
        folderId: folder,
        name: row.name,
        qrType: type,
        content: row.values,
        design: DEFAULT_DESIGN,
        dynamic: asLinks ? { destination: row.payload } : undefined,
      })),
      (count, saved) => {
        reported = count;
        setCreated((current) => [...current, ...saved]);
        setCreating(`Creating ${count} of ${batch.length}…`);
      },
    );
    inFlight.current = false;
    setCreating(null);
    setPlacedIn(folder);
    if (answer.ok) {
      // Codes saved without a progress report (there shouldn't be any) still count.
      const unreported = answer.value.slice(reported);
      if (unreported.length) setCreated((current) => [...current, ...unreported]);
      setRemaining(null);
      toast(`Created ${codes(answer.value.length)}`);
    } else {
      setRemaining(batch.slice(reported));
      toast(answer.error, "error");
    }
  }

  async function download() {
    if (downloading || creating) return;
    setDownloading(`Preparing 0 of ${created.length}…`);
    try {
      await downloadZip(itemsFromCodes(created), format, `quickqreate-${type}-codes.zip`, (done) =>
        setDownloading(`Preparing ${done} of ${created.length}…`),
      );
      toast(`Downloaded ${codes(created.length)}`);
    } catch {
      toast("The ZIP file couldn’t be made. Please try again.", "error");
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Create codes in bulk"
        description={
          workspaceLabel
            ? `Saving to ${workspaceLabel}’s codes`
            : "Turn a spreadsheet into codes in your account, one per row."
        }
      />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <BulkListCard
            type={type}
            onTypeChange={(next) => {
              setType(next);
              startOver();
            }}
            text={text}
            disabled={creating !== null}
            onTextChange={(next) => {
              setText(next);
              startOver();
            }}
          />
          {result && (
            <BulkCheckCard
              result={result}
              rows={rows}
              // Uploading the whole fixed file again would create the other rows twice.
              fixHint={
                created.length > 0
                  ? "Rows that need fixing were left out. To add them, upload a file with just those rows."
                  : undefined
              }
            />
          )}
        </div>

        {/* min-w-0: a long folder name in the Folder list mustn't widen the page on phones. */}
        <aside className="min-w-0 lg:sticky lg:top-6">
          <Card aria-labelledby="bulk-create">
            <CardHeader id="bulk-create" step={result ? 3 : 2} title="Create" />
            <div className="flex flex-col gap-4 px-5 pt-4 pb-6 sm:px-6">
              {type === "url" ? (
                <Toggle
                  label="Trackable"
                  description="Change where they point after printing, and see scans."
                  checked={trackable}
                  disabled={creating !== null}
                  onChange={(on) => {
                    setTrackable(on);
                    startOver();
                  }}
                />
              ) : (
                <p className="rounded-control bg-surface-2 px-3.5 py-2.5 text-sm text-fg">
                  {codeTypeInfo(type).label} codes work without internet, so they can’t change after
                  printing.
                </p>
              )}
              <Field label="Folder">
                {(control) => (
                  <Select
                    {...control}
                    value={folderId}
                    disabled={creating !== null}
                    onChange={(event) => setFolderId(event.target.value)}
                  >
                    <option value="">No folder</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                    <option value={NEW_FOLDER}>New folder…</option>
                  </Select>
                )}
              </Field>
              {folderId === NEW_FOLDER && (
                <Field label="New folder name">
                  {(control) => (
                    <TextInput
                      {...control}
                      maxLength={MAX_FOLDER_NAME}
                      disabled={creating !== null}
                      value={newFolder}
                      onChange={(event) => setNewFolder(event.target.value)}
                    />
                  )}
                </Field>
              )}
              {remaining && (
                <p
                  role="alert"
                  className="rounded-control bg-danger-soft px-3.5 py-2.5 text-sm text-danger"
                >
                  Created {created.length} of {created.length + remaining.length} codes. The other{" "}
                  {remaining.length} weren’t created.
                </p>
              )}
              {!finished && (
                <Button
                  size="lg"
                  disabled={toCreate.length === 0 || creating !== null || downloading !== null}
                  onClick={() => void create()}
                >
                  {creating ? (
                    <Loader2 aria-hidden className="animate-spin" />
                  ) : (
                    <Plus aria-hidden />
                  )}
                  {creating ??
                    (remaining
                      ? `Create the remaining ${remaining.length}`
                      : toCreate.length
                        ? `Create ${codes(toCreate.length)}`
                        : "Create codes")}
                </Button>
              )}
              {created.length > 0 && (
                <div className="flex flex-col gap-3 border-t border-border pt-4">
                  {finished && (
                    <p className="flex items-center gap-2 text-sm text-fg">
                      <CheckCircle2 aria-hidden className="size-4 shrink-0 text-success" />
                      Created {codes(created.length)}
                      {placedName ? ` in ${placedName}` : ""}.
                    </p>
                  )}
                  <Field label="File format">
                    {(control) => (
                      <Select
                        {...control}
                        value={format}
                        onChange={(event) => setFormat(event.target.value as ExportFormat)}
                      >
                        {ZIP_FORMATS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                  <Button
                    variant="outline"
                    disabled={creating !== null || downloading !== null}
                    onClick={() => void download()}
                  >
                    {downloading ? (
                      <Loader2 aria-hidden className="animate-spin" />
                    ) : (
                      <Download aria-hidden />
                    )}
                    {downloading ?? "Download ZIP"}
                  </Button>
                  <Link
                    href={withWorkspace(placedIn ? `/codes?folder=${placedIn}` : "/codes", teamId)}
                    className={cn(buttonClasses("ghost", "md"), "max-w-full")}
                  >
                    {/* A long folder name is cut short instead of pushing the page sideways. */}
                    <span className="truncate">Open {placedName ?? "your codes"}</span>
                  </Link>
                </div>
              )}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  );
}
