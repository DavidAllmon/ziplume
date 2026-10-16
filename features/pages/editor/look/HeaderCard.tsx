"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { hasShape, heroImage } from "@/features/pages/look/options";
import type { LookChange, PageLook } from "@/lib/pages/look";
import type { PageContentMap } from "@/lib/pages/types";
import type { PageTypeId } from "@/lib/qr/types";

/** Classic or Hero (spec 6.4), and the photo's shape where the page has one. */
export function HeaderCard<K extends PageTypeId>({
  type,
  page,
  look,
  onLook,
}: {
  type: K;
  page: PageContentMap[K];
  look: PageLook;
  onLook: (change: LookChange) => void;
}) {
  const image = heroImage(type, page);
  const classic = look.header === "classic" || !image;
  return (
    <Card aria-labelledby="look-header">
      <CardHeader id="look-header" title="Header" />
      <div className="flex flex-col gap-4 px-5 pt-4 pb-6 sm:px-6">
        <SegmentedControl
          aria-label="Header layout"
          size="touch"
          value={look.header}
          onChange={(header) => onLook({ ...look, header })}
          options={[
            { value: "classic", label: "Classic" },
            { value: "hero", label: "Hero" },
          ]}
        />
        {!image && <p className="text-sm text-fg-muted">Add a photo to use Hero</p>}
        {hasShape(type) && classic && (
          <SegmentedControl
            aria-label="Image shape"
            size="touch"
            value={look.shape}
            onChange={(shape) => onLook({ ...look, shape })}
            options={[
              { value: "circle", label: "Circle" },
              { value: "rounded", label: "Rounded" },
            ]}
          />
        )}
      </div>
    </Card>
  );
}
