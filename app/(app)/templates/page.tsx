import type { Metadata } from "next";

import { TemplatesPage } from "@/features/templates/TemplatesPage";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Templates" };

/** Your saved designs; templates are always your own, whichever team's codes you're in. */
export default async function TemplatesRoute() {
  const { supabase } = await requireUser("/templates");
  const { data: templates } = await supabase
    .from("design_templates")
    .select("*")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return <TemplatesPage templates={templates ?? []} />;
}
