"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { PageLook } from "@/lib/pages/look";

/** Where the social icons sit: under the header or at the bottom. */
export function SocialsCard({
  look,
  onLook,
}: {
  look: PageLook;
  onLook: (look: PageLook) => void;
}) {
  return (
    <Card aria-labelledby="look-socials">
      <CardHeader id="look-socials" title="Social icons" />
      <div className="px-5 pt-4 pb-6 sm:px-6">
        <SegmentedControl
          aria-label="Social icons position"
          size="touch"
          value={look.socials}
          onChange={(socials) => onLook({ ...look, socials })}
          options={[
            { value: "top", label: "Under the header" },
            { value: "bottom", label: "At the bottom" },
          ]}
        />
      </div>
    </Card>
  );
}
