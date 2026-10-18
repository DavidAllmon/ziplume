import type { Metadata } from "next";

import { NewTemplatePage } from "@/features/templates/NewTemplatePage";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "New template" };

export default async function NewTemplateRoute() {
  await requireUser("/templates/new");
  return <NewTemplatePage />;
}
