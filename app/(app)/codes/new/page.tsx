import type { Metadata } from "next";

import { CreatePage } from "@/features/create/CreatePage";
import { TypeGallery } from "@/features/create/gallery/TypeGallery";
import { requireUser } from "@/lib/auth/server";
import { defaultDesign } from "@/lib/templates/server";
import { loadTeam } from "@/lib/teams/server";
import { isPageType, isStaticType, type CodeTypeId } from "@/lib/qr/types";

export const metadata: Metadata = { title: "Create a code" };

const isCodeType = (value: string): value is CodeTypeId => isStaticType(value) || isPageType(value);

/** New codes always go in your own space, whoever's codes you came from. */
export default async function NewCodePage({ searchParams }: PageProps<"/codes/new">) {
  const params = await searchParams;
  const folderParam = typeof params.folder === "string" ? params.folder : null;
  const typeParam = typeof params.type === "string" ? params.type : null;
  const { supabase, user } = await requireUser("/codes/new");

  const [{ data: folders }, team, design] = await Promise.all([
    supabase.from("folders").select("*").eq("user_id", user.id).order("name"),
    loadTeam(supabase),
    defaultDesign(supabase, user.id),
  ]);
  // Only one of your own folders counts; anything else starts outside any folder.
  const folder = (folders ?? []).find((f) => f.id === folderParam) ?? null;
  const initialType = typeParam && isCodeType(typeParam) ? typeParam : null;
  if (!initialType) return <TypeGallery userId={user.id} folderId={folder?.id ?? null} />;

  return (
    <CreatePage
      // A new address (type or folder) is a new visit: start from fresh defaults.
      key={`${folder?.id ?? ""}:${initialType}`}
      userId={user.id}
      folders={folders ?? []}
      initialType={initialType}
      initialFolderId={folder?.id ?? null}
      resume={params.resume === "1"}
      inTeam={team.length > 0}
      defaultDesign={design}
    />
  );
}
