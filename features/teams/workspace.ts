"use client";

import { getBrowserSupabase } from "@/lib/supabase/client";
import type { TeamRole } from "@/types/supabase";

import { workspaceLabel } from "./roles";

/** Another account's workspace the signed-in user belongs to. */
export interface Workspace {
  ownerId: string;
  /** The owner's name, or their email when they haven't set one. */
  label: string;
  role: TeamRole;
}

/** The workspace owned by `ownerId`, if the signed-in user can add codes to it. */
export async function editableWorkspace(ownerId: string): Promise<Workspace | null> {
  const supabase = getBrowserSupabase();
  if (!supabase) return null;
  const { data } = await supabase.rpc("my_workspaces");
  const row = data?.find((w) => w.owner_id === ownerId && w.role === "editor");
  return row ? { ownerId, label: workspaceLabel(row), role: row.role } : null;
}
