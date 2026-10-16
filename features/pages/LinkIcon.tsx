import { Mail, MessageSquare, Phone } from "lucide-react";

import type { LinkIcon } from "@/lib/pages/links";

import { MediaImage, SocialIcon } from "./parts";

const TYPE_ICON = { email: Mail, phone: Phone, sms: MessageSquare };

/** The small mark at the start of a link button (spec item 6). */
export function LinkIconMark({ icon }: { icon: LinkIcon }) {
  if (icon.kind === "image") {
    return (
      <span data-link-icon className="size-7 shrink-0 overflow-hidden rounded-md">
        <MediaImage media={icon.image} alt="" className="size-full object-cover" />
      </span>
    );
  }
  if (icon.kind === "type") {
    const Icon = TYPE_ICON[icon.type];
    return <Icon data-link-icon aria-hidden className="size-5 shrink-0" />;
  }
  return (
    <span data-link-icon className="grid size-5 shrink-0 place-items-center">
      <SocialIcon network={icon.network} className="size-5" />
    </span>
  );
}
