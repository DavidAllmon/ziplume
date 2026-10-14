"use client";

import { codeRenderOptions, codeType } from "@/features/dashboard/codeRender";
import { saveBlob } from "@/lib/download";
import { buildFilename } from "@/lib/qr/filename";
import type { QrCodeRow } from "@/types/supabase";

/** Downloads one saved code as a 1024px PNG. */
export async function downloadPng(code: QrCodeRow) {
  const { renderBlob } = await import("@/lib/qr/renderer");
  const blob = await renderBlob(codeRenderOptions(code, 1024), "png");
  saveBlob(blob, buildFilename(codeType(code), code.name, "png"));
}
