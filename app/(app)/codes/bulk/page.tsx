import type { Metadata } from "next";

import { BulkCreatePage } from "@/features/bulk/BulkCreatePage";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Bulk create" };

/** Bulk-created codes always go in your own space, whoever's codes you came from. */
export default async function BulkCreateRoute({ searchParams }: PageProps<"/codes/bulk">) {
  const params = await searchParams;
  const folderParam = typeof params.folder === "string" ? params.folder : null;
  const { supabase, user } = await requireUser("/codes/bulk");

  const { data: folders } = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", user.id)
    .order("name");
  // Only one of your own folders counts; anything else starts outside any folder.
  const folder = (folders ?? []).find((f) => f.id === folderParam) ?? null;

  return (
    <BulkCreatePage
      key={folder?.id ?? ""}
      ownerId={user.id}
      folders={folders ?? []}
      initialFolderId={folder?.id ?? null}
    />
  );
}
