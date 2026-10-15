import { codeTypeInfo } from "@/lib/qr/code-types";
import { PAGE_TYPE_IDS, QR_TYPE_IDS, type CodeTypeId } from "@/lib/qr/types";

import { typeDescription } from "../catalog";

/** The name a type goes by on its own; the two contact kinds are told apart. */
export const galleryLabel = (id: CodeTypeId): string =>
  id === "contact" ? "Contact card" : codeTypeInfo(id).label;

export const LINK_DESCRIPTION = "Send people to a website. Change it any time.";

/** The line under a type's name. */
export const galleryDescription = (id: CodeTypeId) =>
  id === "url" ? LINK_DESCRIPTION : typeDescription(id);

export interface GalleryGroup {
  id: "link" | "pages" | "instant";
  title: string;
  note: string;
  ids: CodeTypeId[];
}

/** Every type, grouped as the gallery shows them, filtered by a search. */
export function galleryGroups(query: string): GalleryGroup[] {
  const needle = query.trim().toLowerCase();
  const matches = (id: CodeTypeId) =>
    !needle || `${galleryLabel(id)} ${galleryDescription(id)}`.toLowerCase().includes(needle);
  const groups: GalleryGroup[] = [
    { id: "link", title: "Link", note: "", ids: (["url"] as CodeTypeId[]).filter(matches) },
    {
      id: "pages",
      title: "Pages",
      note: "A mobile page Ziplume hosts for you. Change it any time.",
      ids: PAGE_TYPE_IDS.filter(matches),
    },
    {
      id: "instant",
      title: "Instant codes",
      note: "Work without internet. They can’t change after printing.",
      ids: QR_TYPE_IDS.filter((id) => id !== "url" && matches(id)),
    },
  ];
  return groups.filter((group) => group.ids.length > 0);
}
