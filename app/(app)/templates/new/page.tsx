import type { Metadata } from "next";

import { TemplateEditor } from "@/features/templates/TemplateEditor";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "New template" };

export default async function NewTemplateRoute() {
  await requireUser("/templates/new");
  return <TemplateEditor />;
}
