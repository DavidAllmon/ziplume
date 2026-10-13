"use client";

import { ChevronUp, Download, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { QR_TYPES } from "@/lib/qr/qr-types";
import type { ScanReport } from "@/lib/qr/scannability";

import { useExport } from "../export/useExport";
import type { Generator } from "../useGenerator";
import { PreviewPanel } from "./PreviewPanel";
import { QrTile } from "./QrTile";

const STATUS_TEXT = {
  ok: "Ready to scan",
  warn: "Scannable, with tips",
  error: "May not scan",
  empty: "",
} as const;

/** Always-visible live thumbnail and primary action on phones. */
export function MobilePreviewBar({
  generator,
  report,
}: {
  generator: Generator;
  report: ScanReport;
}) {
  const [open, setOpen] = useState(false);
  const { state, renderOptions, summary, blocker, filename } = generator;
  const type = QR_TYPES[state.activeType];
  const { download, busy } = useExport({
    options: renderOptions,
    format: state.exportSettings.format,
    filename,
  });

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] shadow-pop backdrop-blur-md md:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-control text-left focus-ring"
          >
            <QrTile
              compact
              options={renderOptions}
              summary={summary}
              emptyHint={type.emptyHint}
              resolution={192}
              className="size-14 shrink-0"
            />
            <span className="flex min-w-0 flex-col">
              <span className="flex items-center gap-1 text-sm font-semibold text-fg">
                {blocker
                  ? "Preview"
                  : report.status === "ok" && report.verified
                    ? "Verified scannable"
                    : STATUS_TEXT[report.status]}
                <ChevronUp aria-hidden className="size-4 text-fg-muted" />
              </span>
              <span className="truncate text-sm text-fg-muted">{blocker ?? summary}</span>
              <span className="sr-only">Open preview and download options</span>
            </span>
          </button>
          <Button onClick={download} disabled={!!blocker || busy !== null} className="px-4">
            {busy ? <Loader2 aria-hidden className="animate-spin" /> : <Download aria-hidden />}
            Download
          </Button>
        </div>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title="Your QR code">
        <div className="pt-2">
          <PreviewPanel generator={generator} report={report} />
        </div>
      </Sheet>
    </>
  );
}
