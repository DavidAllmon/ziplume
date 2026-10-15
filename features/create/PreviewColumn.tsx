"use client";

import { Download } from "lucide-react";

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

/** What the preview shows for a hosted page: the page, or its QR code. */
export type PreviewView = "code" | "page";

/** The live page (or code), its scan check, and Download for codes that don't need saving. */
export function PreviewColumn({
  draft,
  view,
  onViewChange,
  mode,
}: {
  draft: CodeDraft;
  view: PreviewView;
  onViewChange: (view: PreviewView) => void;
  mode: "create" | "edit";
}) {
  const { state, renderOptions, summary, info, report, blocker, pageType, trackable, previewSlug } =
    draft;
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
          onChange={onViewChange}
          options={[
            { value: "page", label: "Page" },
            { value: "code", label: "QR code" },
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
      {!trackable && mode === "create" && (
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
  );
}
