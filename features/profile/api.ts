"use client";

import { AVATAR_BUCKET } from "@/lib/avatar";
import { getBrowserSupabase } from "@/lib/supabase/client";

import { prepareAvatar, validateAvatarFile } from "./avatarImage";

export type PhotoResult = { ok: true; url: string | null } | { ok: false; error: string };

const unavailable: PhotoResult = { ok: false, error: "Photos aren’t available right now." };

/** Deletes the user's uploaded photos except `keep`. Best effort: a leftover file is harmless. */
async function removeUploads(userId: string, keep: string | null) {
  const supabase = getBrowserSupabase();
  if (!supabase) return;
  const bucket = supabase.storage.from(AVATAR_BUCKET);
  const { data } = await bucket.list(userId, { limit: 100 });
  const paths = (data ?? []).map((file) => `${userId}/${file.name}`).filter((p) => p !== keep);
  if (paths.length > 0) await bucket.remove(paths);
}

async function savePhoto(userId: string, url: string | null): Promise<boolean> {
  const supabase = getBrowserSupabase();
  if (!supabase) return false;
  const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
  return !error;
}

/** Crops, shrinks and uploads a photo, makes it the profile photo, and removes older uploads. */
export async function uploadAvatar(userId: string, file: File): Promise<PhotoResult> {
  const problem = validateAvatarFile(file);
  if (problem) return { ok: false, error: problem };
  const supabase = getBrowserSupabase();
  if (!supabase) return unavailable;
  let prepared: Awaited<ReturnType<typeof prepareAvatar>>;
  try {
    prepared = await prepareAvatar(file);
  } catch {
    return { ok: false, error: "That photo couldn’t be read. Try a JPG or PNG." };
  }
  const bucket = supabase.storage.from(AVATAR_BUCKET);
  const path = `${userId}/${crypto.randomUUID()}.${prepared.type === "image/webp" ? "webp" : "png"}`;
  const { error } = await bucket.upload(path, prepared.blob, {
    contentType: prepared.type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) return { ok: false, error: "The photo couldn’t be uploaded. Please try again." };
  const url = bucket.getPublicUrl(path).data.publicUrl;
  if (!(await savePhoto(userId, url))) {
    await bucket.remove([path]);
    return { ok: false, error: "The photo couldn’t be saved. Please try again." };
  }
  await removeUploads(userId, path);
  return { ok: true, url };
}

/** Removes the profile photo and deletes uploaded files. Initials show instead. */
export async function removeAvatar(userId: string): Promise<PhotoResult> {
  if (!(await savePhoto(userId, null))) {
    return { ok: false, error: "The photo couldn’t be removed. Please try again." };
  }
  await removeUploads(userId, null);
  return { ok: true, url: null };
}

/** Goes back to the Google account photo and deletes uploaded files. */
export async function restoreGooglePhoto(userId: string, googleUrl: string): Promise<PhotoResult> {
  if (!(await savePhoto(userId, googleUrl))) {
    return { ok: false, error: "Your Google photo couldn’t be used. Please try again." };
  }
  await removeUploads(userId, null);
  return { ok: true, url: googleUrl };
}
