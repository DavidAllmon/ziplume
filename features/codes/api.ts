"use client";

import { generateSlug, isValidSlug } from "@/lib/dynamic/slug";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { DesignState } from "@/features/generator/state/types";
import type { CodeTypeId } from "@/lib/qr/types";
import type { Database, Json, QrCodeRow, QrStatus } from "@/types/supabase";

/** Stay under the database's 256 KB design limit; very large logos are left out. */
export const MAX_STORED_LOGO_CHARS = 240_000;

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const UNIQUE_VIOLATION = "23505";
const unavailable: Result<never> = { ok: false, error: "Accounts aren't available right now." };

export function designForStorage(design: DesignState): { design: Json; droppedLogo: boolean } {
  const droppedLogo = Boolean(design.logo && design.logo.length > MAX_STORED_LOGO_CHARS);
  return {
    design: { ...design, logo: droppedLogo ? null : design.logo } as unknown as Json,
    droppedLogo,
  };
}

export interface NewCode {
  /** Workspace to create the code in (a team owner's id); defaults to the signed-in user. */
  ownerId?: string;
  folderId?: string | null;
  name: string;
  qrType: CodeTypeId;
  content: unknown;
  design: DesignState;
  /**
   * For dynamic codes: the destination URL (null for hosted pages, whose content is the page)
   * and an optional chosen ending.
   */
  dynamic?: { destination: string | null; slug?: string };
}

export async function createCode(input: NewCode): Promise<Result<QrCodeRow>> {
  const supabase = getBrowserSupabase();
  if (!supabase) return unavailable;
  const { design } = designForStorage(input.design);
  const customSlug = input.dynamic?.slug;
  if (customSlug && !isValidSlug(customSlug)) {
    return { ok: false, error: "Link endings use 3–40 letters, numbers or dashes." };
  }

  // Random endings can collide (rarely); try a few times before giving up.
  for (let attempt = 0; attempt < 4; attempt++) {
    const slug = input.dynamic ? (customSlug ?? generateSlug()) : null;
    const { data, error } = await supabase
      .from("qr_codes")
      .insert({
        ...(input.ownerId && { user_id: input.ownerId }),
        ...(input.folderId && { folder_id: input.folderId }),
        name: input.name.slice(0, 120),
        qr_type: input.qrType,
        content: (input.dynamic?.destination
          ? { url: input.dynamic.destination }
          : input.content) as Json,
        design,
        is_dynamic: Boolean(input.dynamic),
        slug,
        destination: input.dynamic?.destination ?? null,
      })
      .select("*")
      .single();
    if (!error && data) return { ok: true, value: data };
    if (error?.code === UNIQUE_VIOLATION && input.dynamic) {
      if (customSlug)
        return { ok: false, error: "That link ending is already taken. Try another." };
      continue;
    }
    return { ok: false, error: "The code couldn't be saved. Please try again." };
  }
  return { ok: false, error: "The code couldn't be saved. Please try again." };
}

/**
 * Saves many codes at once (bulk creation), in batches. Random link endings that collide are
 * re-rolled. Returns the saved rows in the same order as the input.
 */
export async function createCodes(
  inputs: NewCode[],
  onProgress?: (saved: number) => void,
): Promise<Result<QrCodeRow[]>> {
  const supabase = getBrowserSupabase();
  if (!supabase) return unavailable;
  const saved: QrCodeRow[] = [];
  for (let start = 0; start < inputs.length; start += 100) {
    const batch = inputs.slice(start, start + 100);
    let rows: QrCodeRow[] | null = null;
    for (let attempt = 0; attempt < 4 && !rows; attempt++) {
      const { data, error } = await supabase
        .from("qr_codes")
        .insert(
          batch.map((input) => ({
            ...(input.ownerId && { user_id: input.ownerId }),
            ...(input.folderId && { folder_id: input.folderId }),
            name: input.name.slice(0, 120),
            qr_type: input.qrType,
            content: (input.dynamic?.destination
              ? { url: input.dynamic.destination }
              : input.content) as Json,
            design: designForStorage(input.design).design,
            is_dynamic: Boolean(input.dynamic),
            slug: input.dynamic ? generateSlug() : null,
            destination: input.dynamic?.destination ?? null,
          })),
        )
        .select("*");
      if (!error && data) rows = data;
      else if (error?.code !== UNIQUE_VIOLATION) break;
    }
    if (!rows) {
      return {
        ok: false,
        error: saved.length
          ? `Saved ${saved.length} codes, then something went wrong. Please try the rest again.`
          : "The codes couldn't be saved. Please try again.",
      };
    }
    saved.push(...rows);
    onProgress?.(saved.length);
  }
  return { ok: true, value: saved };
}

export interface CodePatch {
  name?: string;
  content?: unknown;
  design?: DesignState;
  destination?: string;
  slug?: string;
  status?: QrStatus;
  folderId?: string | null;
  activeFrom?: string | null;
  activeUntil?: string | null;
}

export async function updateCode(id: string, patch: CodePatch): Promise<Result<QrCodeRow>> {
  const supabase = getBrowserSupabase();
  if (!supabase) return unavailable;
  if (patch.slug !== undefined && !isValidSlug(patch.slug)) {
    return { ok: false, error: "Link endings use 3–40 letters, numbers or dashes." };
  }
  const update: Database["public"]["Tables"]["qr_codes"]["Update"] = {
    ...(patch.name !== undefined && { name: patch.name.slice(0, 120) }),
    ...(patch.content !== undefined && { content: patch.content as Json }),
    ...(patch.design !== undefined && { design: designForStorage(patch.design).design }),
    ...(patch.destination !== undefined && { destination: patch.destination }),
    ...(patch.slug !== undefined && { slug: patch.slug }),
    ...(patch.status !== undefined && { status: patch.status }),
    ...(patch.folderId !== undefined && { folder_id: patch.folderId }),
    ...(patch.activeFrom !== undefined && { active_from: patch.activeFrom }),
    ...(patch.activeUntil !== undefined && { active_until: patch.activeUntil }),
  };

  const { data, error } = await supabase
    .from("qr_codes")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error?.code === UNIQUE_VIOLATION)
    return { ok: false, error: "That link ending is already taken. Try another." };
  if (error?.message.includes("qr_codes_active_window"))
    return { ok: false, error: "The end date must be after the start date." };
  if (error || !data)
    return { ok: false, error: "Your changes couldn't be saved. Please try again." };
  return { ok: true, value: data };
}

/** Sets a dynamic code's password; an empty password removes it. */
export async function setCodePassword(id: string, password: string): Promise<Result<null>> {
  const supabase = getBrowserSupabase();
  if (!supabase) return unavailable;
  const { error } = await supabase.rpc("set_code_password", { p_code: id, p_password: password });
  if (error?.code === "22023") return { ok: false, error: "Passwords are 4 to 128 characters." };
  if (error) return { ok: false, error: "The password couldn't be changed. Please try again." };
  return { ok: true, value: null };
}

export async function deleteCode(id: string): Promise<Result<null>> {
  const supabase = getBrowserSupabase();
  if (!supabase) return unavailable;
  const { error } = await supabase.from("qr_codes").delete().eq("id", id);
  return error
    ? { ok: false, error: "The code couldn't be deleted. Please try again." }
    : { ok: true, value: null };
}

/** Pauses or resumes many trackable codes in one request; returns the codes that changed. */
export async function setCodesStatus(
  ids: string[],
  status: QrStatus,
): Promise<Result<QrCodeRow[]>> {
  const supabase = getBrowserSupabase();
  if (!supabase) return unavailable;
  if (ids.length === 0) return { ok: true, value: [] };
  const { data, error } = await supabase
    .from("qr_codes")
    .update({ status })
    .in("id", ids)
    .eq("is_dynamic", true)
    .select();
  return error || !data
    ? { ok: false, error: "The codes couldn't be changed. Please try again." }
    : { ok: true, value: data };
}

/** Deletes many codes in one request; returns the ids that were deleted. */
export async function deleteCodes(ids: string[]): Promise<Result<string[]>> {
  const supabase = getBrowserSupabase();
  if (!supabase) return unavailable;
  if (ids.length === 0) return { ok: true, value: [] };
  const { data, error } = await supabase.from("qr_codes").delete().in("id", ids).select("id");
  return error || !data
    ? { ok: false, error: "The codes couldn't be deleted. Please try again." }
    : { ok: true, value: data.map((row) => row.id) };
}

export async function duplicateCode(code: QrCodeRow): Promise<Result<QrCodeRow>> {
  return createCode({
    ownerId: code.user_id,
    folderId: code.folder_id,
    name: `Copy of ${code.name}`.slice(0, 120),
    qrType: code.qr_type as CodeTypeId,
    content: code.content,
    design: code.design as unknown as DesignState,
    dynamic: code.is_dynamic ? { destination: code.destination } : undefined,
  });
}
