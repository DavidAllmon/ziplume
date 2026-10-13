"use client";

import { cn } from "@/lib/cn";
import type { RenderOptions } from "@/lib/qr/renderer";

import { QrView } from "./QrView";

interface QrTileProps {
  options: RenderOptions;
  summary: string;
  emptyHint: string;
  resolution?: number;
  compact?: boolean;
  className?: string;
}

/**
 * The code on its own "paper" tile, so it looks the same as it will when printed,
 * whatever the app theme.
 */
export function QrTile({
  options,
  summary,
  emptyHint,
  resolution = 720,
  compact = false,
  className,
}: QrTileProps) {
  const empty = !options.data;
  return (
    <div
      className={cn(
        "relative overflow-hidden ring-1 ring-black/5",
        compact ? "rounded-lg" : "rounded-[1.25rem] shadow-card",
        options.transparent ? "bg-checker" : "bg-white",
        className,
      )}
    >
      <QrView
        options={options}
        resolution={resolution}
        label={empty ? "Example QR code. Enter content to create yours." : `QR code for ${summary}`}
        className={cn("transition-opacity duration-300", empty && "opacity-10 blur-[1px]")}
      />
      {empty && !compact && (
        <div className="absolute inset-0 grid place-items-center p-8 text-center">
          <p className="max-w-[14rem] text-[15px] font-semibold text-slate-700">{emptyHint}</p>
        </div>
      )}
    </div>
  );
}
