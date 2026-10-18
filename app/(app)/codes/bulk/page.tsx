import type { Metadata } from "next";

import { BulkCreatePage } from "@/features/bulk/BulkCreatePage";
import { requireUser } from "@/lib/auth/server";
import { defaultDesign } from "@/lib/templates/server";

export const metadata: Metadata = { title: "Bulk create" };

/** Bulk-created codes always go in your own space, whoever's codes you came from. */
export default async function BulkCreateRoute({ searchParams }: PageProps<"/codes/bulk">) {
  const params = await searchParams;
  const folderParam = typeof params.folder === "string" ? params.folder : null;
  const { supabase, user } = await requireUser("/codes/bulk");

  const [{ data: folders }, design] = await Promise.all([
    supabase.from("folders").select("*").eq("user_id", user.id).order("name"),
    defaultDesign(supabase, user.id),
  ]);
  // Only one of your own folders counts; anything else starts outside any folder.
  const folder = (folders ?? []).find((f) => f.id === folderParam) ?? null;

  return (
    <BulkCreatePage
      key={folder?.id ?? ""}
      ownerId={user.id}
      folders={folders ?? []}
      initialFolderId={folder?.id ?? null}
      design={design}
    />
  );
}
