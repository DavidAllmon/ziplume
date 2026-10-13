"use client";

import { PageView } from "@/features/pages/PageView";
import { SITE_URL } from "@/lib/env";
import type { PageContentMap } from "@/lib/pages/types";
import type { PageTypeId } from "@/lib/qr/types";

/** The hosted page as scanners will see it, in a phone-sized frame. Links don't navigate. */
export function PagePreview({
  type,
  page,
  slug,
}: {
  type: PageTypeId;
  page: PageContentMap[PageTypeId];
  slug: string;
}) {
  return (
    <div className="mx-auto w-full max-w-[20rem] overflow-hidden rounded-[2rem] border-[6px] border-fg/85 bg-bg shadow-card">
      <div
        aria-label="Page preview"
        role="region"
        className="h-[34rem] overflow-y-auto overscroll-contain"
      >
        <div className="pointer-events-auto [&_main]:-mt-20 [&_main]:px-3">
          <PageView
            type={type}
            content={page}
            slug={slug}
            pageUrl={`${SITE_URL}/p/${slug}`}
            preview
          />
        </div>
      </div>
    </div>
  );
}
