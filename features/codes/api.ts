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

export interface CodePatch {
  name?: string;
  content?: unknown;
  design?: DesignState;
  destination?: string;
  slug?: string;
  status?: QrStatus;
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
  };

  const { data, error } = await supabase
    .from("qr_codes")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error?.code === UNIQUE_VIOLATION)
    return { ok: false, error: "That link ending is already taken. Try another." };
  if (error || !data)
    return { ok: false, error: "Your changes couldn't be saved. Please try again." };
  return { ok: true, value: data };
}

export async function deleteCode(id: string): Promise<Result<null>> {
  const supabase = getBrowserSupabase();
  if (!supabase) return unavailable;
  const { error } = await supabase.from("qr_codes").delete().eq("id", id);
  return error
    ? { ok: false, error: "The code couldn't be deleted. Please try again." }
    : { ok: true, value: null };
}

export async function duplicateCode(code: QrCodeRow): Promise<Result<QrCodeRow>> {
  return createCode({
    name: `Copy of ${code.name}`.slice(0, 120),
    qrType: code.qr_type as CodeTypeId,
    content: code.content,
    design: code.design as unknown as DesignState,
    dynamic: code.is_dynamic ? { destination: code.destination } : undefined,
  });
}
