"use client";

import { accessTo, personLabel, toTeam } from "@/lib/teams/access";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { TeamRole } from "@/types/supabase";

/** A teammate's codes the signed-in person may change. */
export interface Workspace {
  ownerId: string;
  /** The teammate's name, or their email when they haven't set one. */
  label: string;
  role: TeamRole;
}

/** The teammate who owns `ownerId`'s codes, if the signed-in person may change them. */
export async function editableWorkspace(ownerId: string): Promise<Workspace | null> {
  const supabase = getBrowserSupabase();
  if (!supabase) return null;
  const [{ data: session }, { data }] = await Promise.all([
    supabase.auth.getSession(),
    supabase.rpc("my_team"),
  ]);
  const me = session.session?.user.id;
  if (!me) return null;
  const access = accessTo(toTeam(data ?? []), me, ownerId);
  if (!access?.person || !access.canEdit) return null;
  return { ownerId, label: personLabel(access.person), role: "editor" };
}
