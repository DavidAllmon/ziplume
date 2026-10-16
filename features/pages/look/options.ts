import type { Media, PageContentMap } from "@/lib/pages/types";
import type { PageTypeId } from "@/lib/qr/types";

// Which Look tab controls a page type has (spec 6.1, 6.4).

const HEADER_CHOICE: PageTypeId[] = ["links", "vcard", "business", "menu", "feedback", "audio"];

/** Classic or Hero. Coupon and Event are always a banner, App is Classic, PDF/Images/Video have none. */
export const headerChoice = (type: PageTypeId) => HEADER_CHOICE.includes(type);

/** Circle or Rounded: only where the image is a person (profile picture, contact photo). */
export const hasShape = (type: PageTypeId) => type === "links" || type === "vcard";

/** Under the header or at the bottom: the types with social icons. */
export const hasSocials = (type: PageTypeId) =>
  type === "links" || type === "vcard" || type === "business";

const HERO_IMAGE: Partial<Record<PageTypeId, string>> = {
  links: "avatar",
  vcard: "photo",
  business: "cover",
  menu: "logo",
  feedback: "logo",
  audio: "cover",
};

/** The image the Hero would show; without one, the page draws Classic. */
export function heroImage<K extends PageTypeId>(type: K, page: PageContentMap[K]): Media | null {
  const key = HERO_IMAGE[type];
  if (!key) return null;
  const value = (page as unknown as Record<string, unknown>)[key];
  return value && typeof value === "object" ? (value as Media) : null;
}
