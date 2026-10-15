"use client";

import { PageView } from "@/features/pages/PageView";
import { DeviceFrame } from "@/features/pages/preview/DeviceFrame";
import type { DeviceId } from "@/features/pages/preview/devices";
import { PREVIEW_SLUG } from "@/lib/dynamic/slug";
import { SITE_URL } from "@/lib/env";
import type { PageContentMap } from "@/lib/pages/types";
import type { PageTypeId } from "@/lib/qr/types";

/** The hosted page as visitors will see it, on a device of the given size. Links don't
 * navigate and media doesn't play. */
export function PagePreview({
  type,
  page,
  slug,
  device = "phone",
  maxHeight,
}: {
  type: PageTypeId;
  page: PageContentMap[PageTypeId];
  slug: string;
  device?: DeviceId;
  /** See DeviceFrame. */
  maxHeight?: number | string;
}) {
  const pageUrl = `${SITE_URL}/p/${slug}`;
  // Until the page has its own address, don't show a made-up one.
  const address = `${SITE_URL}/p/${slug === PREVIEW_SLUG ? "…" : slug}`;
  return (
    <DeviceFrame
      device={device}
      address={address.replace(/^https?:\/\//, "")}
      maxHeight={maxHeight}
    >
      <PageView type={type} content={page} slug={slug} pageUrl={pageUrl} preview />
    </DeviceFrame>
  );
}
