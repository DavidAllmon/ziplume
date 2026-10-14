import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { workspaceLabel } from "@/features/teams/roles";
import type { Database, TeamRole } from "@/types/supabase";

export interface WorkspaceAccess {
  /** The signed-in user owns the workspace. */
  owner: boolean;
  role: "owner" | TeamRole;
  canEdit: boolean;
  /** The owner's name or email, for someone else's workspace; null for your own. */
  label: string | null;
}

/** What the signed-in user may do in a workspace (a code owner's account). */
export async function workspaceAccess(
  supabase: SupabaseClient<Database>,
  userId: string,
  ownerId: string,
): Promise<WorkspaceAccess | null> {
  if (userId === ownerId) return { owner: true, role: "owner", canEdit: true, label: null };
  const { data } = await supabase.rpc("my_workspaces");
  const row = data?.find((w) => w.owner_id === ownerId);
  if (!row) return null;
  return {
    owner: false,
    role: row.role,
    canEdit: row.role === "editor",
    label: workspaceLabel(row),
  };
}

/** The codes list for a workspace: your own, or a team owner's. */
export const codesHref = (ownerId: string, userId: string) =>
  ownerId === userId ? "/codes" : `/codes?workspace=${ownerId}`;
