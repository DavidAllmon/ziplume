"use client";

import type QRCodeStyling from "qr-code-styling";
import { useDeferredValue, useEffect, useRef } from "react";

import { cn } from "@/lib/cn";
import { loadRenderer, toStylingOptions, type RenderOptions } from "@/lib/qr/renderer";

/** Sample content drawn faintly while the user hasn't entered anything yet. */
const PLACEHOLDER = "https://davidallmon.github.io/QuickQReate/";

interface QrViewProps {
  options: RenderOptions;
  /** Canvas resolution in pixels; the element scales to its container with CSS. */
  resolution: number;
  label: string;
  className?: string;
  onCanvas?: (canvas: HTMLCanvasElement | null) => void;
}

export function QrView({ options, resolution, label, className, onCanvas }: QrViewProps) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<QRCodeStyling | null>(null);
  // Typing stays responsive: React renders the latest input first and redraws the code after.
  const deferred = useDeferredValue(options);

  useEffect(() => {
    let cancelled = false;
    const styling = toStylingOptions(
      { ...deferred, data: deferred.data || PLACEHOLDER, size: resolution },
      "canvas",
    );
    loadRenderer().then((QRCode) => {
      const element = container.current;
      if (cancelled || !element) return;
      if (instance.current) instance.current.update(styling);
      else {
        instance.current = new QRCode(styling);
        instance.current.append(element);
      }
      onCanvas?.(element.querySelector("canvas"));
    });
    return () => {
      cancelled = true;
    };
  }, [deferred, resolution, onCanvas]);

  return (
    <div
      ref={container}
      role="img"
      aria-label={label}
      className={cn("aspect-square [&>canvas]:block [&>canvas]:size-full", className)}
    />
  );
}
