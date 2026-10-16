"use client";

import { LookEditor } from "@/features/pages/editor/look/LookEditor";
import type { PageLook } from "@/lib/pages/look";
import type { PageContentMap } from "@/lib/pages/types";
import type { PageTypeId } from "@/lib/qr/types";

/** The Look tab: how a hosted page looks to visitors. */
export function LookSection({
  type,
  page,
  onLook,
}: {
  type: PageTypeId;
  page: PageContentMap[PageTypeId];
  onLook: (update: (look: PageLook) => PageLook) => void;
}) {
  return <LookEditor type={type} page={page} onLook={onLook} />;
}
