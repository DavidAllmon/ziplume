import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { withWorkspace } from "@/components/app/nav";
import { BulkCreatePage } from "@/features/bulk/BulkCreatePage";
import { workspaceLabel } from "@/features/teams/roles";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Bulk create · QuickQReate" };

export default async function BulkCreateRoute({ searchParams }: PageProps<"/codes/bulk">) {
  const params = await searchParams;
  const requested = typeof params.workspace === "string" ? params.workspace : null;
  const folderParam = typeof params.folder === "string" ? params.folder : null;
  const { supabase, user } = await requireUser(withWorkspace("/codes/bulk", requested));

  const { data: workspaces } = await supabase.rpc("my_workspaces");
  const membership = requested
    ? (workspaces?.find((workspace) => workspace.owner_id === requested) ?? null)
    : null;
  // Viewers can't add codes; send them to the codes they can see.
  if (membership && membership.role !== "editor") {
    redirect(withWorkspace("/codes", membership.owner_id));
  }
  const ownerId = membership?.owner_id ?? user.id;

  const { data: folders } = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", ownerId)
    .order("name");
  // Only a folder of this workspace counts; anything else starts outside any folder.
  const folder = (folders ?? []).find((f) => f.id === folderParam) ?? null;

  return (
    <BulkCreatePage
      key={`${ownerId}:${folder?.id ?? ""}`}
      ownerId={ownerId}
      teamId={membership?.owner_id ?? null}
      workspaceLabel={membership ? workspaceLabel(membership) : null}
      folders={folders ?? []}
      initialFolderId={folder?.id ?? null}
    />
  );
}
