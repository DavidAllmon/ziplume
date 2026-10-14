"use client";

import { useState } from "react";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { PREVIEW_SLUG } from "@/lib/dynamic/slug";
import type { ScanReport } from "@/lib/qr/scannability";

import { SavePanel } from "../SavePanel";
import type { Generator } from "../useGenerator";
import { ExportPanel } from "../export/ExportPanel";
import { PagePreview } from "./PagePreview";
import { QrTile } from "./QrTile";
import { ScanBadge, ScanIssues } from "./ScanCheck";

interface PreviewPanelProps {
  generator: Generator;
  report: ScanReport;
}

/** Preview, scan check and export options. Sticky sidebar on desktop, sheet on mobile. */
export function PreviewPanel({ generator, report }: PreviewPanelProps) {
  const { state, renderOptions, summary, filename, blocker, dispatch, measurement, pageType } =
    generator;
  const type = generator.info;
  const usage = measurement.bytes / measurement.maxBytes;
  const [view, setView] = useState<"code" | "page">("code");
  const showPage = pageType !== null && view === "page";
  return (
    <div className="flex flex-col gap-5">
      {pageType && (
        <SegmentedControl
          aria-label="Preview"
          size="sm"
          value={view}
          onChange={setView}
          options={[
            { value: "code", label: "QR code" },
            { value: "page", label: "Page" },
          ]}
        />
      )}
      {showPage ? (
        <PagePreview
          type={pageType}
          page={state.pages[pageType]}
          slug={generator.slug ?? PREVIEW_SLUG}
        />
      ) : (
        <QrTile
          options={renderOptions}
          summary={summary}
          emptyHint={type.emptyHint}
          className="mx-auto w-full max-w-[20rem]"
        />
      )}
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
      <SavePanel generator={generator} />
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
