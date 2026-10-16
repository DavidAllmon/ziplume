"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { LookChange, PageLook } from "@/lib/pages/look";

import { Labeled } from "../Labeled";

/** Where the social icons sit: under the header or at the bottom. */
export function SocialsCard({
  look,
  onLook,
}: {
  look: PageLook;
  onLook: (change: LookChange) => void;
}) {
  return (
    <Card aria-labelledby="look-socials">
      <CardHeader id="look-socials" title="Social icons" />
      <div className="flex flex-col gap-4 px-5 pt-4 pb-6 sm:px-6">
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
        <Labeled label="Style">
          <SegmentedControl
            aria-label="Social icon style"
            size="touch"
            value={look.socialStyle}
            onChange={(socialStyle) => onLook({ ...look, socialStyle })}
            options={[
              { value: "outline", label: "Outline" },
              { value: "filled", label: "Filled" },
              { value: "plain", label: "Plain" },
              { value: "brand", label: "Brand", ariaLabel: "Brand colors" },
            ]}
          />
        </Labeled>
        <Labeled label="Size">
          <SegmentedControl
            aria-label="Social icon size"
            size="touch"
            value={look.socialSize}
            onChange={(socialSize) => onLook({ ...look, socialSize })}
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
          />
        </Labeled>
      </div>
    </Card>
  );
}
