import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TemplateEditor } from "@/features/templates/TemplateEditor";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Edit template" };

/** Edits one of your templates; row-level security keeps other people's out. */
export default async function EditTemplateRoute({ params }: PageProps<"/templates/[id]/edit">) {
  const { id } = await params;
  const { supabase } = await requireUser(`/templates/${id}/edit`);
  const { data: template } = await supabase
    .from("design_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!template) notFound();
  return <TemplateEditor template={template} />;
}
