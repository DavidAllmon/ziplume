import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CodeEditor } from "@/features/dashboard/CodeEditor";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Edit code · QuickQReate" };

export default async function CodePage({ params }: PageProps<"/dashboard/codes/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser(`/dashboard/codes/${id}`);
  const { data: code } = await supabase.from("qr_codes").select("*").eq("id", id).maybeSingle();
  if (!code) notFound();
  return <CodeEditor code={code} />;
}
