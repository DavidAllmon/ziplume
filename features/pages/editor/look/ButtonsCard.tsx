"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import type { PageLook } from "@/lib/pages/look";

/** Buttons (spec 6.1). */
export function ButtonsCard({
  look: _look,
  onLook: _onLook,
}: {
  look: PageLook;
  onLook: (look: PageLook) => void;
}) {
  return (
    <Card aria-labelledby="look-buttons">
      <CardHeader id="look-buttons" title="Buttons" />
    </Card>
  );
}
