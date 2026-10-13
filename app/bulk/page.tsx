import type { Metadata } from "next";

import { PageShell } from "@/components/layout/PageShell";
import { BulkGenerator } from "@/features/bulk/BulkGenerator";

export const metadata: Metadata = {
  title: "Bulk QR codes · QuickQReate",
  description:
    "Create hundreds of QR codes at once from a spreadsheet and download them as a ZIP. Free, with no limits.",
};

export default function BulkPage() {
  return (
    <PageShell>
      <div className="mb-6 max-w-2xl lg:mb-8">
        <h1 className="font-display text-[1.75rem] leading-tight font-bold tracking-tight text-balance text-fg sm:text-4xl">
          Create codes in bulk
        </h1>
        <p className="mt-2 text-fg-muted sm:text-lg">
          Turn a spreadsheet into a ZIP of QR codes, one per row. Everything happens in your
          browser.
        </p>
      </div>
      <BulkGenerator />
    </PageShell>
  );
}
