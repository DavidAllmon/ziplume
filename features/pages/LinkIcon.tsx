import { CalendarCheck, Mail, MessageSquare, Phone, ShoppingBag, Star } from "lucide-react";

import type { LinkIcon } from "@/lib/pages/links";

import { MediaImage, SocialIcon } from "./parts";

const TYPE_ICON = { email: Mail, phone: Phone, sms: MessageSquare };
// Business's ready-made buttons (spec item 19).
const PRESET_ICON = { review: Star, book: CalendarCheck, order: ShoppingBag };

/** The small mark at the start of a link button (spec item 6). */
export function LinkIconMark({ icon }: { icon: LinkIcon }) {
  if (icon.kind === "image") {
    return (
      <span data-link-icon className="size-7 shrink-0 overflow-hidden rounded-md">
        <MediaImage media={icon.image} alt="" className="size-full object-cover" />
      </span>
    );
  }
  if (icon.kind === "type" || icon.kind === "preset") {
    const Icon = icon.kind === "type" ? TYPE_ICON[icon.type] : PRESET_ICON[icon.preset];
    return <Icon data-link-icon aria-hidden className="size-5 shrink-0" />;
  }
  return (
    <span data-link-icon className="grid size-5 shrink-0 place-items-center">
      <SocialIcon network={icon.network} className="size-5" />
    </span>
  );
}
