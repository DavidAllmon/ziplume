import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/PageShell";
import { accountsEnabled } from "@/lib/env";

export default function AuthLayout({ children }: { children: ReactNode }) {
  if (!accountsEnabled) notFound();
  return <PageShell>{children}</PageShell>;
}
