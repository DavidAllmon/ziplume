import type { TeamRole } from "@/types/supabase";

export const ROLE_LABELS: Record<TeamRole, string> = { viewer: "Viewer", editor: "Editor" };

export const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  viewer:
    "As a viewer you see everyone’s codes in the team, with their analytics and feedback, and you create and change your own.",
  editor:
    "As an editor you see and change everyone’s codes and folders in the team, and you create your own.",
};

/** "Owner", "Editor" or "Viewer". */
export const roleLabel = (role: "owner" | TeamRole) =>
  role === "owner" ? "Owner" : ROLE_LABELS[role];

/** A workspace's name: its owner's name, or their email when they haven't set one. */
export const workspaceLabel = (row: { owner_name: string | null; owner_email: string }) =>
  row.owner_name?.trim() || row.owner_email;
