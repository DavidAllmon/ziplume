"use client";

import { designForStorage, type Result } from "@/features/codes/api";
import type { DesignState } from "@/features/generator/state/types";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { DesignTemplateRow } from "@/types/supabase";

const unavailable: Result<never> = { ok: false, error: "Accounts aren't available right now." };

export async function listTemplates(): Promise<Result<DesignTemplateRow[]>> {
  const supabase = getBrowserSupabase();
  if (!supabase) return unavailable;
  const { data, error } = await supabase
    .from("design_templates")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return { ok: false, error: "Your templates couldn't be loaded." };
  return { ok: true, value: data };
}

export async function saveTemplate(
  name: string,
  design: DesignState,
): Promise<Result<DesignTemplateRow> & { droppedLogo?: boolean }> {
  const supabase = getBrowserSupabase();
  if (!supabase) return unavailable;
  const stored = designForStorage(design);
  const { data, error } = await supabase
    .from("design_templates")
    .insert({ name: name.trim().slice(0, 60) || "My template", design: stored.design })
    .select("*")
    .single();
  if (error || !data) return { ok: false, error: "The template couldn't be saved." };
  return { ok: true, value: data, droppedLogo: stored.droppedLogo };
}

export async function deleteTemplate(id: string): Promise<Result<null>> {
  const supabase = getBrowserSupabase();
  if (!supabase) return unavailable;
  const { error } = await supabase.from("design_templates").delete().eq("id", id);
  return error
    ? { ok: false, error: "The template couldn't be deleted." }
    : { ok: true, value: null };
}
