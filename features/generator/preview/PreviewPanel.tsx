"use client";

import { QR_TYPES } from "@/lib/qr/qr-types";
import type { ScanReport } from "@/lib/qr/scannability";

import type { Generator } from "../useGenerator";
import { ExportPanel } from "../export/ExportPanel";
import { QrTile } from "./QrTile";
import { ScanBadge, ScanIssues } from "./ScanCheck";

interface PreviewPanelProps {
  generator: Generator;
  report: ScanReport;
}

/** Preview, scan check and export options. Sticky sidebar on desktop, sheet on mobile. */
export function PreviewPanel({ generator, report }: PreviewPanelProps) {
  const { state, renderOptions, summary, filename, blocker, dispatch } = generator;
  const type = QR_TYPES[state.activeType];
  return (
    <div className="flex flex-col gap-5">
      <QrTile
        options={renderOptions}
        summary={summary}
        emptyHint={type.emptyHint}
        className="mx-auto w-full max-w-[20rem]"
      />
      <div className="flex flex-col items-center gap-2 text-center">
        <ScanBadge report={report} />
        {summary && (
          <p className="max-w-full truncate text-sm text-fg-muted">
            <span className="font-medium text-fg">{type.label}</span> · {summary}
          </p>
        )}
      </div>
      <ScanIssues report={report} />
      <hr className="border-border" />
      <ExportPanel
        options={renderOptions}
        settings={state.exportSettings}
        filename={filename}
        blocker={blocker}
        dispatch={dispatch}
      />
    </div>
  );
}
