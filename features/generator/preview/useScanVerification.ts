"use client";

import { useEffect, useRef, useState } from "react";

import { measure } from "@/lib/qr/capacity";
import { renderBlob, type RenderOptions } from "@/lib/qr/renderer";
import type { Verification } from "@/lib/qr/scannability";

const DEBOUNCE_MS = 500;

/**
 * Pixel sizes for the test renders, at a few module scales. Phone cameras see a code at
 * many sizes; jsQR occasionally misses a style at one scale and reads it at another.
 */
function testSizes(options: RenderOptions): number[] {
  const modules = measure(options.data, options.errorCorrection).modules ?? 33;
  return [5, 7, 3.5].map((px) => Math.round(Math.min(1400, Math.max(320, (modules + 8) * px))));
}

async function decodes(options: RenderOptions): Promise<boolean> {
  for (const size of testSizes(options)) {
    if (await decodesAt(options, size)) return true;
  }
  return false;
}

async function decodesAt(options: RenderOptions, size: number): Promise<boolean> {
  const [{ default: jsQR }, blob] = await Promise.all([
    import("jsqr"),
    renderBlob({ ...options, size }, "png"),
  ]);
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return true;
  // Transparent codes are judged on white, as they would usually be printed.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(data, width, height, { inversionAttempts: "attemptBoth" })?.data === options.data;
}

/**
 * Renders the code off-screen and reads it back with a real QR decoder, so the scan
 * badge reflects what a camera would see rather than rules of thumb alone.
 */
export function useScanVerification(options: RenderOptions, enabled: boolean): Verification {
  const [result, setResult] = useState<{ key: RenderOptions; value: Verification } | null>(null);
  const latest = useRef(options);

  useEffect(() => {
    latest.current = options;
    if (!enabled) return;
    const timer = window.setTimeout(() => {
      decodes(options)
        .then((ok) => {
          if (latest.current === options)
            setResult({ key: options, value: ok ? "verified" : "failed" });
        })
        .catch(() => {
          // Rendering failed (e.g. a broken logo); keep the heuristic report only.
        });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [options, enabled]);

  // Results for older options are stale; report "pending" until the new check finishes.
  return enabled && result?.key === options ? result.value : null;
}
