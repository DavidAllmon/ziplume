"use client";

import { Download, Loader2, Plus, Save } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useExport } from "@/features/generator/export/useExport";
import { PagePreview } from "@/features/generator/preview/PagePreview";
import { QrTile } from "@/features/generator/preview/QrTile";
import { ScanBadge, ScanIssues } from "@/features/generator/preview/ScanCheck";

import { typeLabel } from "./catalog";
import type { CodeDraft } from "./useCodeDraft";

export interface CreateControls {
  /** "edit" saves changes to a saved code instead of creating one. */
  mode: "create" | "edit";
  submitting: boolean;
  onSubmit: () => void;
  /** Why the last save failed, until the next change. */
  error: string | null;
  /** Edit mode: whether anything differs from the saved code. */
  dirty?: boolean;
  /** Edit mode: puts the form back the way it was saved. */
  onDiscard?: () => void;
}

/** The live code (or page), its scan check and the one Create (or Save changes) button. */
export function PreviewColumn({
  draft,
  mode,
  submitting,
  onSubmit,
  error,
  dirty = false,
  onDiscard,
}: { draft: CodeDraft } & CreateControls) {
  const editing = mode === "edit";
  const { state, renderOptions, summary, info, report, blocker, pageType, trackable, previewSlug } =
    draft;
  const [view, setView] = useState<"code" | "page">("code");
  const reasonId = useId();
  const { download, busy } = useExport({
    options: renderOptions,
    format: "png",
    filename: draft.filename,
  });

  return (
    <div className="flex flex-col gap-5">
      {pageType && (
        <SegmentedControl
          aria-label="Preview"
          size="touch"
          value={view}
          onChange={setView}
          options={[
            { value: "code", label: "QR code" },
            { value: "page", label: "Page" },
          ]}
        />
      )}
      {pageType && view === "page" ? (
        <PagePreview type={pageType} page={state.code.pages[pageType]} slug={previewSlug} />
      ) : (
        <QrTile
          options={renderOptions}
          summary={summary}
          emptyHint={info.emptyHint}
          className="mx-auto w-full max-w-[20rem]"
        />
      )}
      <div className="flex flex-col items-center gap-2 text-center">
        <ScanBadge report={report} />
        {summary && (
          <p className="max-w-full truncate text-sm text-fg-muted">
            <span className="font-medium text-fg">{typeLabel(state.code.activeType)}</span> ·{" "}
            {summary}
          </p>
        )}
      </div>
      <ScanIssues report={report} />
      <div className="flex flex-col gap-2">
        <Button
          onClick={onSubmit}
          disabled={blocker !== null || submitting || (editing && !dirty)}
          aria-describedby={blocker ? reasonId : undefined}
          className="w-full"
        >
          {submitting ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : editing ? (
            <Save aria-hidden />
          ) : (
            <Plus aria-hidden />
          )}
          {submitting
            ? editing
              ? "Saving…"
              : "Creating…"
            : editing
              ? "Save changes"
              : "Create code"}
        </Button>
        {editing && dirty && !submitting && onDiscard && (
          <Button variant="ghost" onClick={onDiscard} className="w-full">
            Discard changes
          </Button>
        )}
        {blocker && (
          <p id={reasonId} className="text-center text-sm text-fg-muted">
            {blocker}
          </p>
        )}
        {error && (
          <p role="alert" className="text-center text-sm text-danger">
            {error}
          </p>
        )}
        {!trackable && !editing && (
          <Button
            variant="ghost"
            onClick={() => void download()}
            disabled={blocker !== null || busy !== null}
            className="w-full"
          >
            <Download aria-hidden /> Download without saving
          </Button>
        )}
      </div>
    </div>
  );
}
