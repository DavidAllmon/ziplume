"use client";

import { useDeferredValue, useEffect, useRef } from "react";

import { cn } from "@/lib/cn";
import { paintSvg, renderSvg, type RenderOptions } from "@/lib/qr/renderer";

/** Sample content drawn faintly while the user hasn't entered anything yet. */
const PLACEHOLDER = "https://qr.techitdave.com";

interface QrViewProps {
  options: RenderOptions;
  /** Width the artwork is drawn at; the canvas scales to its container with CSS. */
  resolution: number;
  label: string;
  className?: string;
}

/** Shows the exact artwork that downloads produce (code, frame and logo). */
export function QrView({ options, resolution, label, className }: QrViewProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  // Typing stays responsive: React renders the latest input first and redraws the code after.
  const deferred = useDeferredValue(options);

  useEffect(() => {
    let cancelled = false;
    renderSvg({ ...deferred, data: deferred.data || PLACEHOLDER, size: resolution })
      .then((rendered) => {
        if (!cancelled && canvas.current) {
          return paintSvg(rendered, canvas.current, undefined, () => !cancelled);
        }
      })
      .catch(() => {
        // A broken logo or similar: keep showing the last good drawing.
      });
    return () => {
      cancelled = true;
    };
  }, [deferred, resolution]);

  return (
    <div
      role={label ? "img" : undefined}
      aria-label={label || undefined}
      className={cn("relative aspect-square", className)}
    >
      <canvas
        ref={canvas}
        width={0}
        height={0}
        className="absolute inset-0 size-full object-contain"
      />
    </div>
  );
}
