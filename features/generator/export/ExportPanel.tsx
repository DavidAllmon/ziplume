"use client";

import { Copy, Download, Loader2, Share2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { cn } from "@/lib/cn";
import type { RenderOptions } from "@/lib/qr/renderer";
import type { ExportFormat } from "@/lib/qr/types";

import { EXPORT_SIZES } from "../state/defaults";
import type { ExportSettings, GeneratorAction } from "../state/types";
import { useExport } from "./useExport";

const FORMATS = [
  { value: "png", label: "PNG" },
  { value: "svg", label: "SVG" },
  { value: "jpeg", label: "JPG" },
  { value: "webp", label: "WebP" },
] as const satisfies readonly { value: ExportFormat; label: string }[];

const SIZE_OPTIONS = EXPORT_SIZES.map((size) => ({
  value: String(size.value),
  label: size.value >= 1024 ? `${size.value / 1024}K` : String(size.value),
  ariaLabel: `${size.label}, ${size.value} pixels`,
}));

const FORMAT_HINT: Record<ExportFormat, string> = {
  png: "Works everywhere. Supports transparency.",
  svg: "Vector file that stays sharp at any size. Best for print.",
  jpeg: "Small file, no transparency.",
  webp: "Smallest file for websites.",
};

interface ExportPanelProps {
  options: RenderOptions;
  settings: ExportSettings;
  filename: string;
  blocker: string | null;
  dispatch: (action: GeneratorAction) => void;
}

export function ExportPanel({ options, settings, filename, blocker, dispatch }: ExportPanelProps) {
  const { download, copy, share, canCopy, canShare, busy } = useExport({
    options,
    format: settings.format,
    filename,
  });
  const disabled = blocker !== null || busy !== null;
  const sizeLabel = EXPORT_SIZES.find((s) => s.value === settings.size);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span aria-hidden className="text-sm font-medium text-fg">
          Format
        </span>
        <SegmentedControl
          aria-label="Format"
          value={settings.format}
          onChange={(format) => dispatch({ type: "setExport", patch: { format } })}
          options={FORMATS}
        />
        <p className="text-sm text-fg-muted">{FORMAT_HINT[settings.format]}</p>
      </div>

      <div className={cn("flex flex-col gap-1.5", settings.format === "svg" && "opacity-60")}>
        <div className="flex items-baseline justify-between">
          <span aria-hidden className="text-sm font-medium text-fg">
            Size
          </span>
          <span className="text-sm text-fg-muted tabular-nums">
            {settings.size} × {settings.size} px
            {sizeLabel && ` · ${sizeLabel.hint}`}
          </span>
        </div>
        <SegmentedControl
          aria-label="Size"
          value={String(settings.size)}
          onChange={(size) => dispatch({ type: "setExport", patch: { size: Number(size) } })}
          options={SIZE_OPTIONS}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Button size="lg" onClick={download} disabled={disabled} className="w-full">
          {busy === "download" ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : (
            <Download aria-hidden />
          )}
          Download {FORMATS.find((f) => f.value === settings.format)?.label}
        </Button>
        {(canCopy || canShare) && (
          <div className="grid auto-cols-fr grid-flow-col gap-2">
            {canCopy && (
              <Button variant="outline" onClick={copy} disabled={disabled}>
                <Copy aria-hidden /> Copy image
              </Button>
            )}
            {canShare && (
              <Button variant="outline" onClick={share} disabled={disabled}>
                <Share2 aria-hidden /> Share
              </Button>
            )}
          </div>
        )}
        {blocker && (
          <p className="text-center text-sm text-fg-muted" role="status">
            {blocker}
          </p>
        )}
      </div>
    </div>
  );
}
