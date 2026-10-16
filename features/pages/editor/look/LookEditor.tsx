"use client";

import { hasSocials, headerChoice } from "@/features/pages/look/options";
import type { LookChange, PageLook } from "@/lib/pages/look";
import type { PageContentMap } from "@/lib/pages/types";
import type { PageTypeId } from "@/lib/qr/types";

import { ButtonsCard } from "./ButtonsCard";
import { HeaderCard } from "./HeaderCard";
import { SocialsCard } from "./SocialsCard";
import { TextCard } from "./TextCard";
import { ThemeCard } from "./ThemeCard";
import { WallpaperCard } from "./WallpaperCard";

/** The Look tab (spec 6.1): how the page looks to visitors, card by card. */
export function LookEditor<K extends PageTypeId>({
  type,
  page,
  onLook: change,
}: {
  type: K;
  page: PageContentMap[K];
  /** Applied to the latest look, so an upload or Undo that lands later keeps newer edits. */
  onLook: (update: (look: PageLook) => PageLook) => void;
}) {
  const look = page.look;
  const onLook = (next: LookChange) => change(typeof next === "function" ? next : () => next);
  return (
    <div className="flex flex-col gap-6">
      <ThemeCard look={look} onLook={onLook} />
      {headerChoice(type) && <HeaderCard type={type} page={page} look={look} onLook={onLook} />}
      <WallpaperCard look={look} onLook={onLook} />
      <TextCard look={look} onLook={onLook} />
      <ButtonsCard look={look} onLook={onLook} />
      {hasSocials(type) && <SocialsCard look={look} onLook={onLook} />}
    </div>
  );
}
