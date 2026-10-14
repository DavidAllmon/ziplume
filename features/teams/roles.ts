import type { TeamRole } from "@/types/supabase";

export const ROLE_LABELS: Record<TeamRole, string> = { viewer: "Viewer", editor: "Editor" };

export const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  viewer: "As a viewer you can see their codes, scan analytics and feedback.",
  editor:
    "As an editor you can create, change and delete their codes and folders, and see their analytics.",
};

/** A workspace's name: its owner's name, or their email when they haven't set one. */
export const workspaceLabel = (row: { owner_name: string | null; owner_email: string }) =>
  row.owner_name?.trim() || row.owner_email;
