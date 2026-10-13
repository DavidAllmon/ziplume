"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import { useToast } from "@/components/ui/Toast";
import { saveBlob } from "@/lib/download";
import { renderBlob, type RenderOptions } from "@/lib/qr/renderer";
import type { ExportFormat } from "@/lib/qr/types";

const noopSubscribe = () => () => {};

/** Feature checks that only make sense in the browser (false during prerendering). */
function useCapabilities() {
  const canCopy = useSyncExternalStore(
    noopSubscribe,
    () => typeof ClipboardItem !== "undefined" && typeof navigator.clipboard?.write === "function",
    () => false,
  );
  const canShare = useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        const probe = new File([new Blob()], "qr.png", { type: "image/png" });
        return typeof navigator.canShare === "function" && navigator.canShare({ files: [probe] });
      } catch {
        return false;
      }
    },
    () => false,
  );
  return { canCopy, canShare };
}

interface ExportInput {
  options: RenderOptions;
  format: ExportFormat;
  filename: string;
}

export function useExport({ options, format, filename }: ExportInput) {
  const toast = useToast();
  const { canCopy, canShare } = useCapabilities();
  const [busy, setBusy] = useState<"download" | "copy" | "share" | null>(null);
  const pngName = filename.replace(/\.\w+$/, ".png");

  const download = useCallback(async () => {
    setBusy("download");
    try {
      saveBlob(await renderBlob(options, format), filename);
      toast(`Downloaded ${filename}`);
    } catch {
      toast("Download failed. Please try again.", "error");
    } finally {
      setBusy(null);
    }
  }, [options, format, filename, toast]);

  const copy = useCallback(async () => {
    setBusy("copy");
    try {
      // Safari requires the ClipboardItem to be created synchronously inside the click,
      // so it receives a promise for the image rather than the finished blob.
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": renderBlob(options, "png") }),
      ]);
      toast("Copied to clipboard");
    } catch {
      toast("Couldn't copy. Try downloading instead.", "error");
    } finally {
      setBusy(null);
    }
  }, [options, toast]);

  const share = useCallback(async () => {
    setBusy("share");
    try {
      const blob = await renderBlob(options, "png");
      await navigator.share({
        files: [new File([blob], pngName, { type: "image/png" })],
        title: "QR code",
      });
    } catch (error) {
      if ((error as DOMException)?.name !== "AbortError") {
        toast("Couldn't open the share sheet.", "error");
      }
    } finally {
      setBusy(null);
    }
  }, [options, pngName, toast]);

  return { download, copy, share, canCopy, canShare, busy };
}
