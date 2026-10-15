"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { AccentField } from "@/features/pages/editor/fields";
import { withButtonColor } from "@/lib/pages/look";
import type { PageContentMap } from "@/lib/pages/types";
import type { PageTypeId } from "@/lib/qr/types";

/** The Look tab: how a hosted page looks to visitors. */
export function LookSection({
  page,
  onChange,
}: {
  page: PageContentMap[PageTypeId];
  onChange: (page: PageContentMap[PageTypeId]) => void;
}) {
  return (
    <Card aria-labelledby="look-heading">
      <CardHeader
        id="look-heading"
        title="Page look"
        description="How your page looks to visitors."
      />
      <div className="px-5 pt-4 pb-6 sm:px-6">
        <AccentField
          value={page.look.button.color}
          onChange={(color) => onChange(withButtonColor(page, color))}
        />
      </div>
    </Card>
  );
}
