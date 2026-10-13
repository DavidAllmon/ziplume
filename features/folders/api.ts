"use client";

import type { Result } from "@/features/codes/api";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { FolderRow } from "@/types/supabase";

const unavailable: Result<never> = { ok: false, error: "Accounts aren't available right now." };
export const MAX_FOLDER_NAME = 60;

function folderError(error: { code?: string } | null, fallback: string): string {
  return error?.code === "23505" ? "There’s already a folder with that name." : fallback;
}

/** Creates a folder in a workspace (your own, or a team owner's). */
export async function createFolder(ownerId: string, name: string): Promise<Result<FolderRow>> {
  const supabase = getBrowserSupabase();
  if (!supabase) return unavailable;
  const { data, error } = await supabase
    .from("folders")
    .insert({ name: name.trim().slice(0, MAX_FOLDER_NAME), user_id: ownerId })
    .select("*")
    .single();
  if (error || !data)
    return { ok: false, error: folderError(error, "The folder couldn’t be created.") };
  return { ok: true, value: data };
}

export async function renameFolder(id: string, name: string): Promise<Result<FolderRow>> {
  const supabase = getBrowserSupabase();
  if (!supabase) return unavailable;
  const { data, error } = await supabase
    .from("folders")
    .update({ name: name.trim().slice(0, MAX_FOLDER_NAME) })
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data)
    return { ok: false, error: folderError(error, "The folder couldn’t be renamed.") };
  return { ok: true, value: data };
}

/** Deletes a folder; its codes stay, without a folder. */
export async function deleteFolder(id: string): Promise<Result<null>> {
  const supabase = getBrowserSupabase();
  if (!supabase) return unavailable;
  const { error } = await supabase.from("folders").delete().eq("id", id);
  return error
    ? { ok: false, error: "The folder couldn’t be deleted. Please try again." }
    : { ok: true, value: null };
}

/** Files codes in a folder, or takes them out of any folder with null. */
export async function moveCodes(ids: string[], folderId: string | null): Promise<Result<null>> {
  const supabase = getBrowserSupabase();
  if (!supabase) return unavailable;
  const { error } = await supabase.from("qr_codes").update({ folder_id: folderId }).in("id", ids);
  return error
    ? { ok: false, error: "The codes couldn’t be moved. Please try again." }
    : { ok: true, value: null };
}
