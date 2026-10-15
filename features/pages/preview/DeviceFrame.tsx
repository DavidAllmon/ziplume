"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

import { DEVICES, fitScale, outerSize, type DeviceId } from "./devices";

/** Until the box is measured (and where ResizeObserver doesn't exist), assume the editor's
 * preview column. */
const DEFAULT_WIDTH = 312;

/**
 * Shows `children` on a device's real-sized screen (so the page lays out as it would there),
 * inside a phone, a tablet or a browser frame, scaled down to fit the available width and
 * `maxHeight`. The screen scrolls on its own.
 */
export function DeviceFrame({
  device,
  address,
  maxHeight = 560,
  children,
}: {
  device: DeviceId;
  /** Shown in the desktop frame's address bar. */
  address: string;
  maxHeight?: number;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  useEffect(() => {
    const element = box.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(entry.contentRect.width || DEFAULT_WIDTH);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const spec = DEVICES[device];
  const outer = outerSize(device);
  const scale = fitScale(device, { width, height: maxHeight });

  return (
    <div ref={box} className="w-full">
      <div
        className="relative mx-auto"
        style={{ width: outer.width * scale, height: outer.height * scale }}
      >
        <div
          className={cn(
            "absolute top-0 left-0 overflow-hidden bg-bg shadow-pop",
            device === "desktop" ? "rounded-xl border border-border" : "border-fg/85",
          )}
          style={{
            width: outer.width,
            height: outer.height,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            borderWidth: device === "desktop" ? 1 : spec.chrome.x,
            borderRadius: device === "phone" ? 48 : device === "tablet" ? 32 : undefined,
          }}
        >
          {device === "desktop" && (
            <div className="flex h-9 items-center gap-2 border-b border-border bg-surface-2 px-3">
              <span aria-hidden className="size-3 rounded-full bg-border" />
              <span aria-hidden className="size-3 rounded-full bg-border" />
              <span aria-hidden className="size-3 rounded-full bg-border" />
              <span className="ml-3 truncate rounded-md bg-surface px-3 py-1 font-mono text-[13px] text-fg-muted">
                {address}
              </span>
            </div>
          )}
          <div
            role="region"
            aria-label="Page preview"
            className="overflow-x-hidden overflow-y-auto overscroll-contain"
            style={{ width: spec.width, height: spec.height }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
