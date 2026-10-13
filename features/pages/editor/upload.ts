"use client";

import { MEDIA_BUCKET } from "@/lib/pages/urls";
import { MAX_UPLOAD_BYTES, type Media } from "@/lib/pages/types";
import { getBrowserSupabase } from "@/lib/supabase/client";

export type MediaKind = "image" | "pdf" | "audio" | "video";

export const ACCEPT: Record<MediaKind, string> = {
  image: "image/png,image/jpeg,image/webp,image/gif",
  pdf: "application/pdf",
  audio: "audio/mpeg,audio/mp4,audio/aac,audio/wav,audio/x-wav,audio/ogg,audio/webm,.mp3,.m4a",
  video: "video/mp4,video/webm,video/quicktime",
};

const MIME_OK: Record<MediaKind, (type: string) => boolean> = {
  image: (t) => ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(t),
  pdf: (t) => t === "application/pdf",
  audio: (t) => t.startsWith("audio/"),
  video: (t) => ["video/mp4", "video/webm", "video/quicktime"].includes(t),
};

const EXTENSION: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/ogg": "ogg",
  "audio/webm": "weba",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

/** Some browsers report an empty type for .mp3/.m4a; fall back to the extension. */
function mimeOf(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return ext === "mp3" ? "audio/mpeg" : ext === "m4a" ? "audio/mp4" : "";
}

export function checkFile(file: File, kind: MediaKind): string | null {
  if (!MIME_OK[kind](mimeOf(file))) {
    return {
      image: "Use a PNG, JPG, WebP or GIF image.",
      pdf: "That file isn't a PDF.",
      audio: "Use an MP3, M4A, WAV or OGG audio file.",
      video: "Use an MP4, WebM or MOV video.",
    }[kind];
  }
  if (file.size > MAX_UPLOAD_BYTES) return "Files can be up to 50 MB.";
  return null;
}

/**
 * Shrinks large photos before upload (they're shown on phones), keeping transparency.
 * GIFs are left alone so animations survive.
 */
async function prepareImage(
  file: File,
  maxSide: number,
): Promise<{ blob: Blob; type: string; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const scale = Math.min(1, maxSide / Math.max(width, height));
  if (file.type === "image/gif" || (scale === 1 && file.size < 600_000)) {
    bitmap.close();
    return { blob: file, type: file.type, width, height };
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const webp = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", 0.86),
  );
  if (webp && webp.type === "image/webp") {
    return { blob: webp, type: "image/webp", width: canvas.width, height: canvas.height };
  }
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  return {
    blob: png ?? file,
    type: png ? "image/png" : file.type,
    width: canvas.width,
    height: canvas.height,
  };
}

/**
 * Uploads a file to the page-media bucket, in the folder of the workspace the page belongs to
 * (the signed-in user's own, or a team owner's when an editor works on their pages).
 */
export async function uploadMedia(
  file: File,
  kind: MediaKind,
  { maxSide = 1600, ownerId }: { maxSide?: number; ownerId?: string | null } = {},
): Promise<{ ok: true; media: Media } | { ok: false; error: string }> {
  const problem = checkFile(file, kind);
  if (problem) return { ok: false, error: problem };
  const supabase = getBrowserSupabase();
  if (!supabase) return { ok: false, error: "Uploads aren't available right now." };
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { ok: false, error: "Sign in to upload files." };

  let blob: Blob = file;
  let type = mimeOf(file);
  let width: number | undefined;
  let height: number | undefined;
  if (kind === "image") {
    try {
      ({ blob, type, width, height } = await prepareImage(file, maxSide));
    } catch {
      return { ok: false, error: "That image couldn't be read." };
    }
  }

  const path = `${ownerId ?? data.user.id}/${crypto.randomUUID()}.${EXTENSION[type] ?? "bin"}`;
  const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(path, blob, {
    contentType: type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    return {
      ok: false,
      error: /exceed|too large|size/i.test(error.message)
        ? "That file is too large."
        : "The upload failed. Please try again.",
    };
  }
  const name =
    file.name.replace(/[^\w.\- ]+/g, "").slice(0, 120) || `file.${EXTENSION[type] ?? "bin"}`;
  return {
    ok: true,
    media: { path, name, type, size: blob.size, ...(width ? { width, height } : {}) },
  };
}
