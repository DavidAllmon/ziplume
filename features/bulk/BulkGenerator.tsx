"use client";

import { AlertCircle, CheckCircle2, Download, FileUp, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";

import { Button, buttonClasses } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select, Textarea, TextInput } from "@/components/ui/inputs";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/features/auth/useSession";
import { createCodes } from "@/features/codes/api";
import { codePayload, codeRenderOptions } from "@/features/dashboard/codeRender";
import { createFolder, MAX_FOLDER_NAME } from "@/features/folders/api";
import { QrTile } from "@/features/generator/preview/QrTile";
import { DEFAULT_DESIGN } from "@/features/generator/state/defaults";
import { editableWorkspace, type Workspace } from "@/features/teams/workspace";
import { csvField } from "@/lib/analytics/shape";
import { bulkColumns, MAX_BULK_ROWS, parseBulk, templateCsv } from "@/lib/bulk/rows";
import { saveBlob } from "@/lib/download";
import { accountsEnabled, shortLink } from "@/lib/env";
import { codeTypeInfo } from "@/lib/qr/code-types";
import { QR_TYPE_IDS, type ExportFormat, type QrTypeId } from "@/lib/qr/types";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { FolderRow, QrCodeRow } from "@/types/supabase";

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "png", label: "PNG" },
  { value: "svg", label: "SVG (vector)" },
  { value: "pdf", label: "PDF (vector)" },
  { value: "eps", label: "EPS (vector)" },
  { value: "jpeg", label: "JPG" },
];
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const PREVIEW_ROWS = 100;
const NEW_FOLDER = "__new__";

/** One QR code per spreadsheet row, downloaded together as a ZIP and optionally saved. */
export function BulkGenerator() {
  const toast = useToast();
  const { user } = useSession();
  const fileId = useId();
  const [type, setType] = useState<QrTypeId>("url");
  const [text, setText] = useState("");
  const [fileError, setFileError] = useState("");
  // Bulk codes use the classic design; they never copy the last code you designed.
  const design = DEFAULT_DESIGN;
  const [format, setFormat] = useState<ExportFormat>("png");
  const [save, setSave] = useState(false);
  const [dynamic, setDynamic] = useState(false);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [folderId, setFolderId] = useState("");
  const [newFolder, setNewFolder] = useState("");
  const [progress, setProgress] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  // /bulk?workspace=<owner id> saves into a team workspace.
  useEffect(() => {
    const owner = new URLSearchParams(window.location.search).get("workspace");
    if (owner && user) void editableWorkspace(owner).then(setWorkspace);
  }, [user]);

  const ownerId = workspace?.ownerId ?? user?.id ?? null;
  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase || !ownerId) return;
    void supabase
      .from("folders")
      .select("*")
      .eq("user_id", ownerId)
      .order("name")
      .then(({ data }) => setFolders(data ?? []));
  }, [ownerId]);

  const result = useMemo(
    () => (text.trim() ? parseBulk(type, text, design.errorCorrection) : null),
    [type, text, design.errorCorrection],
  );
  const valid = result?.rows.filter((row) => !row.error) ?? [];
  const invalid = (result?.rows.length ?? 0) - valid.length;
  const canSave = accountsEnabled && Boolean(user);
  const makeDynamic = save && dynamic && type === "url";
  const preview = valid[0];

  function downloadTemplate() {
    saveBlob(
      new Blob([templateCsv(type)], { type: "text/csv;charset=utf-8" }),
      `quickqreate-${type}-template.csv`,
    );
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    setFileError("");
    if (file.size > MAX_FILE_BYTES) return setFileError("That file is over 2 MB.");
    try {
      setText(await file.text());
      setSavedCount(null);
    } catch {
      setFileError("That file couldn’t be read.");
    }
  }

  async function resolveFolder(): Promise<string | null | undefined> {
    if (folderId !== NEW_FOLDER) return folderId || null;
    if (!newFolder.trim() || !ownerId) return null;
    const created = await createFolder(ownerId, newFolder);
    if (!created.ok) {
      toast(created.error, "error");
      return undefined;
    }
    setFolders((current) => [...current, created.value]);
    setFolderId(created.value.id);
    setNewFolder("");
    return created.value.id;
  }

  async function run() {
    if (!valid.length) return;
    let entries: { label: string; options: ReturnType<typeof codeRenderOptions> }[];
    let index: string[][];

    if (save && canSave) {
      const folder = await resolveFolder();
      if (folder === undefined) return;
      setProgress(`Saving 0 of ${valid.length}…`);
      const saved = await createCodes(
        valid.map((row) => ({
          ownerId: workspace?.ownerId,
          folderId: folder,
          name: row.name,
          qrType: type,
          content: row.values,
          design,
          dynamic: makeDynamic ? { destination: row.payload } : undefined,
        })),
        (count) => setProgress(`Saving ${count} of ${valid.length}…`),
      );
      if (!saved.ok) {
        setProgress(null);
        return toast(saved.error, "error");
      }
      setSavedCount(saved.value.length);
      entries = saved.value.map((code: QrCodeRow) => ({
        label: code.name,
        options: codeRenderOptions(code, 1024),
      }));
      index = saved.value.map((code) => [
        code.name,
        code.is_dynamic ? (code.destination ?? "") : codePayload(code),
        code.is_dynamic && code.slug ? shortLink(code.slug) : "",
      ]);
    } else {
      entries = valid.map((row) => ({
        label: row.name,
        options: { ...design, data: row.payload, size: 1024 },
      }));
      index = valid.map((row) => [row.name, row.payload, ""]);
    }

    setProgress(`Preparing 0 of ${entries.length}…`);
    try {
      const { uniqueFilenames, zipCodes } = await import("@/lib/qr/zip");
      const names = uniqueFilenames(
        entries.map((entry) => entry.label),
        format,
      );
      const csv = [
        ["file", "name", "content", "short_link"],
        ...index.map((row, i) => [names[i]!, ...row]),
      ]
        .map((row) => row.map((cell) => csvField(cell)).join(","))
        .join("\r\n");
      const blob = await zipCodes(
        entries,
        format,
        (done) => setProgress(`Preparing ${done} of ${entries.length}…`),
        { "index.csv": csv },
      );
      saveBlob(blob, `quickqreate-${type}-codes.zip`);
      toast(`Downloaded ${entries.length} ${entries.length === 1 ? "code" : "codes"}`);
    } catch {
      toast("The ZIP file couldn’t be made. Please try again.", "error");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
      <div className="flex min-w-0 flex-col gap-6">
        <Card aria-labelledby="bulk-list">
          <CardHeader
            id="bulk-list"
            step={1}
            title="Your list"
            description={`One code per row, up to ${MAX_BULK_ROWS}. Export from Excel, Google Sheets or Numbers as CSV, or paste the cells.`}
          />
          <div className="flex flex-col gap-4 px-5 pt-4 pb-6 sm:px-6">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field label="Type of code">
                {(control) => (
                  <Select
                    {...control}
                    value={type}
                    onChange={(e) => {
                      setType(e.target.value as QrTypeId);
                      setSavedCount(null);
                    }}
                  >
                    {QR_TYPE_IDS.map((id) => (
                      <option key={id} value={id}>
                        {codeTypeInfo(id).label}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download aria-hidden /> CSV template
              </Button>
            </div>
            <p className="text-sm text-fg-muted">
              Columns:{" "}
              {bulkColumns(type).map((column, i) => (
                <span key={column}>
                  {i > 0 && ", "}
                  <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-xs text-fg">
                    {column}
                  </code>
                </span>
              ))}
              . Only the ones you need; extra columns are ignored.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <label
                htmlFor={fileId}
                className={`${buttonClasses("secondary", "md")} cursor-pointer`}
              >
                <FileUp aria-hidden /> Upload CSV
              </label>
              <input
                id={fileId}
                type="file"
                accept=".csv,.tsv,.txt,text/csv,text/plain"
                className="sr-only"
                onChange={(e) => {
                  void readFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
              <span className="text-sm text-fg-muted">or paste below</span>
            </div>
            {fileError && <p className="text-sm text-danger">{fileError}</p>}
            <Field label="CSV">
              {(control) => (
                <Textarea
                  {...control}
                  rows={8}
                  spellCheck={false}
                  className="font-mono text-sm"
                  placeholder={templateCsv(type)}
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    setSavedCount(null);
                  }}
                />
              )}
            </Field>
          </div>
        </Card>

        {result && (
          <Card aria-labelledby="bulk-check">
            <CardHeader
              id="bulk-check"
              step={2}
              title="Check your codes"
              description={
                result.error
                  ? undefined
                  : `${valid.length} ready${invalid ? `, ${invalid} need fixing` : ""}.`
              }
            />
            <div className="flex flex-col gap-3 px-5 pt-4 pb-6 sm:px-6">
              {result.error ? (
                <p className="flex items-start gap-2 rounded-control bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
                  <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                  {result.error}
                </p>
              ) : (
                <>
                  {(result.ignored.length > 0 || result.skipped > 0) && (
                    <p className="text-sm text-fg-muted">
                      {result.ignored.length > 0 &&
                        `Ignored columns: ${result.ignored.join(", ")}. `}
                      {result.skipped > 0 &&
                        `Only the first ${MAX_BULK_ROWS} rows are used; ${result.skipped} more were left out.`}
                    </p>
                  )}
                  <div
                    role="region"
                    aria-label="Codes from your list"
                    tabIndex={0}
                    className="max-h-96 overflow-auto rounded-control border border-border focus-ring"
                  >
                    <table className="w-full text-left text-sm">
                      <thead className="sticky top-0 bg-surface-2 text-fg">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Row</th>
                          <th className="px-3 py-2 font-semibold">Name</th>
                          <th className="px-3 py-2 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.rows.slice(0, PREVIEW_ROWS).map((row) => (
                          <tr key={row.line} className="border-t border-border align-top">
                            <td className="px-3 py-2 text-fg-muted tabular-nums">{row.line}</td>
                            <td className="max-w-56 truncate px-3 py-2 text-fg">{row.name}</td>
                            <td className="px-3 py-2">
                              {row.error ? (
                                <span className="flex items-start gap-1.5 text-danger">
                                  <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                                  {row.error}
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 text-success">
                                  <CheckCircle2 aria-hidden className="size-4 shrink-0" />
                                  Ready
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {result.rows.length > PREVIEW_ROWS && (
                    <p className="text-sm text-fg-muted">
                      Showing the first {PREVIEW_ROWS} of {result.rows.length} rows.
                    </p>
                  )}
                  {invalid > 0 && (
                    <p className="text-sm text-fg-muted">
                      Rows that need fixing are left out. Fix them in your file and upload it again.
                    </p>
                  )}
                </>
              )}
            </div>
          </Card>
        )}
      </div>

      <aside className="lg:sticky lg:top-24">
        <Card aria-labelledby="bulk-download">
          <CardHeader id="bulk-download" step={result ? 3 : 2} title="Download" />
          <div className="flex flex-col gap-4 px-5 pt-4 pb-6 sm:px-6">
            <div className="flex items-center gap-4">
              <QrTile
                compact
                options={{ ...design, data: preview?.payload ?? "", size: 256 }}
                summary={preview?.name ?? ""}
                emptyHint=""
                resolution={192}
                className="size-24 shrink-0"
              />
              <p className="text-sm text-fg-muted">
                Every code uses the classic black-and-white design, which scans most reliably.
              </p>
            </div>
            <Field label="File format">
              {(control) => (
                <Select
                  {...control}
                  value={format}
                  onChange={(e) => setFormat(e.target.value as ExportFormat)}
                >
                  {FORMATS.map((f) => (
                    <option key={f.value} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>

            {canSave && (
              <div className="flex flex-col gap-3 rounded-control bg-surface-2 p-4">
                <Toggle
                  checked={save}
                  onChange={setSave}
                  label="Also save to my codes"
                  description="Keep them in your account to find, edit and organize later."
                />
                {save && type === "url" && (
                  <Toggle
                    checked={dynamic}
                    onChange={setDynamic}
                    label="Make them dynamic"
                    description="Short links you can repoint later, with scan analytics."
                  />
                )}
                {save && (
                  <Field label="Folder">
                    {(control) => (
                      <Select
                        {...control}
                        value={folderId}
                        onChange={(e) => setFolderId(e.target.value)}
                      >
                        <option value="">No folder</option>
                        {folders.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.name}
                          </option>
                        ))}
                        <option value={NEW_FOLDER}>New folder…</option>
                      </Select>
                    )}
                  </Field>
                )}
                {save && folderId === NEW_FOLDER && (
                  <Field label="New folder name">
                    {(control) => (
                      <TextInput
                        {...control}
                        maxLength={MAX_FOLDER_NAME}
                        value={newFolder}
                        onChange={(e) => setNewFolder(e.target.value)}
                      />
                    )}
                  </Field>
                )}
                {save && workspace && (
                  <p className="flex items-center gap-1.5 text-sm text-fg-muted">
                    <Users aria-hidden className="size-4" /> Saving to {workspace.label}’s workspace
                  </p>
                )}
              </div>
            )}

            <Button size="lg" disabled={!valid.length || progress !== null} onClick={run}>
              <Download aria-hidden />
              {progress ??
                (valid.length
                  ? `${save && canSave ? "Save and download" : "Download"} ${valid.length} ${valid.length === 1 ? "code" : "codes"}`
                  : "Download ZIP")}
            </Button>
            {savedCount !== null && (
              <p className="text-sm text-success">
                Saved {savedCount} codes.{" "}
                <Link
                  href={workspace ? `/dashboard?workspace=${workspace.ownerId}` : "/dashboard"}
                  className="font-medium text-link underline-offset-4 hover:underline"
                >
                  Open My codes
                </Link>
              </p>
            )}
            {!canSave && accountsEnabled && (
              <p className="text-sm text-fg-muted">
                <Link
                  href="/login?next=/bulk"
                  className="font-medium text-link underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>{" "}
                to save them to your account or make dynamic links.
              </p>
            )}
          </div>
        </Card>
      </aside>
    </div>
  );
}
