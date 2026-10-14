import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { withWorkspace } from "@/components/app/nav";
import { CreatePage } from "@/features/create/CreatePage";
import { workspaceLabel } from "@/features/teams/roles";
import { requireUser } from "@/lib/auth/server";
import { isPageType, isStaticType, type CodeTypeId } from "@/lib/qr/types";

export const metadata: Metadata = { title: "Create a code · QuickQReate" };

const isCodeType = (value: string): value is CodeTypeId => isStaticType(value) || isPageType(value);

export default async function NewCodePage({ searchParams }: PageProps<"/codes/new">) {
  const params = await searchParams;
  const requested = typeof params.workspace === "string" ? params.workspace : null;
  const folderParam = typeof params.folder === "string" ? params.folder : null;
  const typeParam = typeof params.type === "string" ? params.type : null;
  const { supabase, user } = await requireUser(withWorkspace("/codes/new", requested));

  const { data: workspaces } = await supabase.rpc("my_workspaces");
  const membership = requested
    ? (workspaces?.find((workspace) => workspace.owner_id === requested) ?? null)
    : null;
  // Viewers can't add codes; send them to the codes they can see.
  if (membership && membership.role !== "editor") {
    redirect(withWorkspace("/codes", membership.owner_id));
  }
  const ownerId = membership?.owner_id ?? user.id;
  const teamId = membership?.owner_id ?? null;

  const { data: folders } = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", ownerId)
    .order("name");
  // Only a folder of this workspace counts; anything else starts outside any folder.
  const folder = (folders ?? []).find((f) => f.id === folderParam) ?? null;
  const initialType = typeParam && isCodeType(typeParam) ? typeParam : "url";

  return (
    <CreatePage
      // A new address (type, folder or team) is a new visit: start from fresh defaults.
      key={`${ownerId}:${folder?.id ?? ""}:${initialType}`}
      userId={user.id}
      teamId={teamId}
      workspaceLabel={membership ? workspaceLabel(membership) : null}
      folders={folders ?? []}
      initialType={initialType}
      initialFolderId={folder?.id ?? null}
    />
  );
}
