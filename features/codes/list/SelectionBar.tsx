"use client";

import { Download, FolderInput, Pause, Play, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/inputs";
import { useToast } from "@/components/ui/Toast";
import { codePayload, codeRenderOptions } from "@/features/dashboard/codeRender";
import { saveBlob } from "@/lib/download";
import type { ExportFormat } from "@/lib/qr/types";
import type { QrCodeRow } from "@/types/supabase";

const ZIP_FORMATS: { value: ExportFormat; label: string }[] = [
  { value: "png", label: "PNG" },
  { value: "svg", label: "SVG" },
  { value: "pdf", label: "PDF" },
  { value: "eps", label: "EPS" },
];

/** Sticky bar for the selected codes: Download (ZIP), Move, Pause/Resume, Delete, Clear. */
export function SelectionBar({
  selected,
  canEdit,
  busy,
  onMove,
  onSetPaused,
  onDelete,
  onClear,
}: {
  selected: QrCodeRow[];
  canEdit: boolean;
  /** What's running (e.g. "Pausing 40 of 200…"), or null. Actions wait until it's done. */
  busy: string | null;
  onMove: () => void;
  onSetPaused: (paused: boolean) => void;
  onDelete: () => void;
  onClear: () => void;
}) {
  const toast = useToast();
  const [format, setFormat] = useState<ExportFormat>("png");
  const [progress, setProgress] = useState<string | null>(null);
  const trackable = selected.filter((code) => code.is_dynamic);
  const allPaused = trackable.length > 0 && trackable.every((code) => code.status === "paused");

  async function downloadZip() {
    const entries = selected
      .filter((code) => codePayload(code))
      .map((code) => ({ label: code.name, options: codeRenderOptions(code, 1024) }));
    if (!entries.length) return;
    setProgress(`Preparing 0 of ${entries.length}…`);
    try {
      const { zipCodes } = await import("@/lib/qr/zip");
      const blob = await zipCodes(entries, format, (done) =>
        setProgress(`Preparing ${done} of ${entries.length}…`),
      );
      saveBlob(blob, `ziplume-codes-${new Date().toISOString().slice(0, 10)}.zip`);
      toast(`Downloaded ${entries.length} ${entries.length === 1 ? "code" : "codes"}`);
    } catch {
      toast("The ZIP file couldn’t be made. Please try again.", "error");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div
      role="region"
      aria-label="Selected codes"
      className="sticky bottom-24 z-20 flex flex-wrap items-center gap-2 rounded-card border border-border bg-surface p-3 shadow-pop sm:bottom-4"
    >
      <span className="px-1 text-sm font-semibold text-fg">{selected.length} selected</span>
      {busy && (
        <span role="status" className="text-sm text-fg-muted">
          {busy}
        </span>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <label>
          <span className="sr-only">ZIP file format</span>
          <Select
            value={format}
            onChange={(e) => setFormat(e.target.value as ExportFormat)}
            className="w-24"
          >
            {ZIP_FORMATS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
        <Button onClick={downloadZip} disabled={progress !== null || busy !== null}>
          <Download aria-hidden />
          {progress ?? "Download ZIP"}
        </Button>
        {canEdit && (
          <Button variant="outline" onClick={onMove} disabled={busy !== null}>
            <FolderInput aria-hidden /> Move
          </Button>
        )}
        {canEdit && trackable.length > 0 && (
          <Button
            variant="outline"
            onClick={() => onSetPaused(!allPaused)}
            disabled={busy !== null}
          >
            {allPaused ? <Play aria-hidden /> : <Pause aria-hidden />}
            {allPaused ? "Resume" : "Pause"}
          </Button>
        )}
        {canEdit && (
          <Button
            variant="outline"
            onClick={onDelete}
            disabled={busy !== null}
            className="text-danger"
          >
            <Trash2 aria-hidden /> Delete
          </Button>
        )}
        <Button variant="ghost" onClick={onClear} disabled={busy !== null}>
          <X aria-hidden /> Clear
        </Button>
      </div>
    </div>
  );
}
