import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CodeEditor } from "@/features/dashboard/CodeEditor";
import { requireUser } from "@/lib/auth/server";
import { codesHref, workspaceAccess } from "@/lib/teams/server";

export const metadata: Metadata = { title: "Edit code · QuickQReate" };

export default async function CodePage({ params }: PageProps<"/codes/[id]">) {
  const { id } = await params;
  const { supabase, user } = await requireUser(`/codes/${id}`);
  const { data: code } = await supabase.from("qr_codes").select("*").eq("id", id).maybeSingle();
  if (!code) notFound();
  const [access, { data: folders }] = await Promise.all([
    workspaceAccess(supabase, user.id, code.user_id),
    supabase.from("folders").select("*").eq("user_id", code.user_id).order("name"),
  ]);
  return (
    <CodeEditor
      code={code}
      canEdit={access?.canEdit ?? false}
      folders={folders ?? []}
      back={{
        href: codesHref(code.user_id, user.id),
        label: access?.label ? `${access.label}’s codes` : "All codes",
      }}
    />
  );
}
