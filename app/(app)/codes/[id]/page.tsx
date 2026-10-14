import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { withWorkspace } from "@/components/app/nav";

import { CodeEditor } from "@/features/dashboard/CodeEditor";
import { requireUser } from "@/lib/auth/server";
import { personLabel } from "@/lib/teams/access";
import { codesHref, personAccess } from "@/lib/teams/server";

export const metadata: Metadata = { title: "Edit code · QuickQReate" };

export default async function CodePage({ params, searchParams }: PageProps<"/codes/[id]">) {
  const { id } = await params;
  const { workspace } = await searchParams;
  const { supabase, user } = await requireUser(`/codes/${id}`);
  const { data: code } = await supabase.from("qr_codes").select("*").eq("id", id).maybeSingle();
  if (!code) notFound();
  // A teammate's code opens inside that team, so the sidebar and Create stay in their codes.
  if (code.user_id !== user.id && workspace !== code.user_id) {
    redirect(withWorkspace(`/codes/${id}`, code.user_id));
  }
  const [access, { data: folders }] = await Promise.all([
    personAccess(supabase, user.id, code.user_id),
    supabase.from("folders").select("*").eq("user_id", code.user_id).order("name"),
  ]);
  return (
    <CodeEditor
      code={code}
      canEdit={access?.canEdit ?? false}
      folders={folders ?? []}
      back={{
        href: codesHref(code.user_id, user.id),
        label: access?.person ? `${personLabel(access.person)}’s codes` : "All codes",
      }}
    />
  );
}
