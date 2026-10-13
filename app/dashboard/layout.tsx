import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/PageShell";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <PageShell>{children}</PageShell>;
}
