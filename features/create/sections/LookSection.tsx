"use client";

import { LookEditor } from "@/features/pages/editor/look/LookEditor";
import type { PageContentMap } from "@/lib/pages/types";
import type { PageTypeId } from "@/lib/qr/types";

/** The Look tab: how a hosted page looks to visitors. */
export function LookSection({
  type,
  page,
  onChange,
}: {
  type: PageTypeId;
  page: PageContentMap[PageTypeId];
  onChange: (page: PageContentMap[PageTypeId]) => void;
}) {
  return <LookEditor type={type} page={page} onChange={onChange} />;
}
