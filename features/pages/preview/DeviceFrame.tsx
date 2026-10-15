"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";

import { DEVICES, fitScale, outerSize, type DeviceId } from "./devices";

/** Until the box is measured, assume the editor's preview column. */
const DEFAULT_WIDTH = 312;
const DEFAULT_HEIGHT = 560;

/**
 * Shows `children` on a device's real-sized screen (so the page lays out as it would there),
 * inside a phone, a tablet or a browser frame, scaled down to fit the available width and
 * `maxHeight`. The screen scrolls on its own.
 */
export function DeviceFrame({
  device,
  address,
  maxHeight = DEFAULT_HEIGHT,
  children,
}: {
  device: DeviceId;
  /** Shown in the desktop frame's address bar. */
  address: string;
  /** In px, or a CSS length such as "min(560px, 55dvh)" that's measured in the browser. */
  maxHeight?: number | string;
  children: ReactNode;
}) {
  const box = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState({ width: 0, height: 0 });
  // Measured before the first paint (so the frame never shows at a guessed size), then again
  // whenever the box or the screen changes size.
  useLayoutEffect(() => {
    const element = box.current;
    if (!element) return;
    const measure = () =>
      setMeasured((last) => {
        const next = { width: element.clientWidth, height: probe.current?.clientHeight ?? 0 };
        return next.width === last.width && next.height === last.height ? last : next;
      });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (probe.current) observer.observe(probe.current);
    return () => observer.disconnect();
  }, []);

  const spec = DEVICES[device];
  const outer = outerSize(device);
  const height = typeof maxHeight === "number" ? maxHeight : measured.height || DEFAULT_HEIGHT;
  const scale = fitScale(device, { width: measured.width || DEFAULT_WIDTH, height });

  return (
    <div ref={box} className="w-full">
      {typeof maxHeight === "string" && (
        // Resolves the CSS length to px; takes no room itself.
        <div aria-hidden className="h-0 overflow-hidden">
          <div ref={probe} data-frame-height style={{ height: maxHeight }} />
        </div>
      )}
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
            // Focusable, so keyboard users can scroll it; no desktop scrollbar, which would
            // narrow the page below the device's real width.
            tabIndex={0}
            className="scrollbar-none overflow-x-hidden overflow-y-auto overscroll-contain focus-visible:outline-4 focus-visible:-outline-offset-4 focus-visible:outline-ring"
            style={{ width: spec.width, height: spec.height }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
