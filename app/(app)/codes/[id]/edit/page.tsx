import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { withWorkspace } from "@/components/app/nav";
import { EditCodePage } from "@/features/create/EditCodePage";
import { isEditableType } from "@/features/create/load";
import { requireUser } from "@/lib/auth/server";
import { accessTo } from "@/lib/teams/access";
import { loadTeam } from "@/lib/teams/server";

export const metadata: Metadata = { title: "Edit code" };

/** A saved code in the Create editor: the owner and teammates who can edit; others see the code page. */
export default async function EditCodeRoute({
  params,
  searchParams,
}: PageProps<"/codes/[id]/edit">) {
  const { id } = await params;
  const { workspace } = await searchParams;
  const { supabase, user } = await requireUser(`/codes/${id}/edit`);
  const { data: code } = await supabase.from("qr_codes").select("*").eq("id", id).maybeSingle();
  if (!code) notFound();
  const own = code.user_id === user.id;
  // A teammate's code opens inside that team, so the sidebar stays in their codes.
  if (!own && workspace !== code.user_id) {
    redirect(withWorkspace(`/codes/${id}/edit`, code.user_id));
  }
  const codeHref = withWorkspace(`/codes/${id}`, own ? null : code.user_id);
  const [team, { data: folders }] = await Promise.all([
    loadTeam(supabase),
    supabase.from("folders").select("*").eq("user_id", code.user_id).order("name"),
  ]);
  const access = accessTo(team, user.id, code.user_id);
  if (!access?.canEdit || !isEditableType(code.qr_type)) redirect(codeHref);
  return (
    <EditCodePage
      code={code}
      folders={folders ?? []}
      mediaOwner={own ? null : code.user_id}
      codeHref={codeHref}
      canBePrivate={own && team.length > 0}
    />
  );
}
