import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { withWorkspace } from "@/components/app/nav";
import { EditCodePage } from "@/features/create/EditCodePage";
import { isEditableType } from "@/features/create/load";
import { requireUser } from "@/lib/auth/server";
import { personAccess } from "@/lib/teams/server";

export const metadata: Metadata = { title: "Edit code · QuickQReate" };

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
  const [access, { data: folders }] = await Promise.all([
    personAccess(supabase, user.id, code.user_id),
    supabase.from("folders").select("*").eq("user_id", code.user_id).order("name"),
  ]);
  if (!access?.canEdit || !isEditableType(code.qr_type)) redirect(codeHref);
  return (
    <EditCodePage
      code={code}
      folders={folders ?? []}
      mediaOwner={own ? null : code.user_id}
      codeHref={codeHref}
    />
  );
}
