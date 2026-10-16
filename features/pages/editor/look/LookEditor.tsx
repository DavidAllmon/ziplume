"use client";

import { hasSocials, headerChoice } from "@/features/pages/look/options";
import type { PageLook } from "@/lib/pages/look";
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
  onChange,
}: {
  type: K;
  page: PageContentMap[K];
  onChange: (page: PageContentMap[K]) => void;
}) {
  const look = page.look;
  // color stays equal to the button color (read by API users and older drafts).
  const onLook = (next: PageLook) => onChange({ ...page, look: next, color: next.button.color });
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
