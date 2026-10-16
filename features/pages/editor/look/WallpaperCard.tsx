"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import type { PageLook } from "@/lib/pages/look";

/** Wallpaper (spec 6.1). */
export function WallpaperCard({
  look: _look,
  onLook: _onLook,
}: {
  look: PageLook;
  onLook: (look: PageLook) => void;
}) {
  return (
    <Card aria-labelledby="look-wallpaper">
      <CardHeader id="look-wallpaper" title="Wallpaper" />
    </Card>
  );
}
