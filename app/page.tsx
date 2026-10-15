import Link from "next/link";
import { Suspense } from "react";

import { PageShell } from "@/components/layout/PageShell";
import { Generator } from "@/features/generator/Generator";

export default function Home() {
  return (
    <PageShell className="pb-32 md:pb-16">
      <div className="mb-6 max-w-2xl lg:mb-8">
        <h1 className="font-display text-[1.75rem] leading-tight font-bold tracking-tight text-balance text-fg sm:text-4xl">
          Make it. Link it. Share it.
        </h1>
        <p className="mt-2 text-fg-muted sm:text-lg">
          QR codes, short links, and simple sharing tools. Free forever, with no sign-up needed.
          Create a free account for editable codes and scan analytics.
        </p>
        <p className="mt-2 text-sm text-fg-muted">
          Need lots of codes?{" "}
          <Link href="/bulk" className="font-medium text-link underline-offset-4 hover:underline">
            Create them in bulk from a spreadsheet
          </Link>
          .
        </p>
      </div>
      {/* Generator reads ?type= with useSearchParams, which needs a boundary. */}
      <Suspense fallback={<div className="min-h-[36rem]" aria-busy="true" />}>
        <Generator />
      </Suspense>
    </PageShell>
  );
}
