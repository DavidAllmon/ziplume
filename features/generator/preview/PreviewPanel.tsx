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
  const { state, renderOptions, summary, filename, blocker, dispatch, measurement } = generator;
  const type = QR_TYPES[state.activeType];
  const usage = measurement.bytes / measurement.maxBytes;
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
      {usage >= 0.5 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-fg">Capacity</span>
            <span className="text-fg-muted tabular-nums">
              {measurement.bytes.toLocaleString()} / {measurement.maxBytes.toLocaleString()} bytes
            </span>
          </div>
          <div
            role="meter"
            aria-label="Content capacity used"
            aria-valuemin={0}
            aria-valuemax={measurement.maxBytes}
            aria-valuenow={Math.min(measurement.bytes, measurement.maxBytes)}
            className="h-2 overflow-hidden rounded-full bg-surface-2"
          >
            <div
              className={
                usage > 1
                  ? "h-full bg-danger"
                  : usage > 0.85
                    ? "h-full bg-warning"
                    : "h-full bg-primary"
              }
              style={{ width: `${Math.min(100, usage * 100)}%` }}
            />
          </div>
        </div>
      )}
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
