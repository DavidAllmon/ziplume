import type { ReactNode } from "react";

import { PageShell } from "@/components/layout/PageShell";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <PageShell>
      <article className="mx-auto flex max-w-2xl flex-col gap-4 text-fg [&_a]:font-medium [&_a]:text-link [&_a]:underline-offset-4 hover:[&_a]:underline [&_h1]:font-display [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h2]:mt-4 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_li]:text-fg-muted [&_p]:leading-relaxed [&_p]:text-fg-muted [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </article>
    </PageShell>
  );
}
