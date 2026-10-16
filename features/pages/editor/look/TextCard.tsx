"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import type { PageLook } from "@/lib/pages/look";

/** Text (spec 6.1). */
export function TextCard({
  look: _look,
  onLook: _onLook,
}: {
  look: PageLook;
  onLook: (look: PageLook) => void;
}) {
  return (
    <Card aria-labelledby="look-text">
      <CardHeader id="look-text" title="Text" />
    </Card>
  );
}
