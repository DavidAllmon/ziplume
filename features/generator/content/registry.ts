import {
  Contact,
  Link2,
  Mail,
  MessageSquareText,
  Phone,
  Type,
  Wifi,
  type LucideIcon,
} from "lucide-react";

import type { QrTypeId } from "@/lib/qr/types";

/** UI-only metadata for each QR type; encoding and validation live in lib/qr/qr-types.ts. */
export const TYPE_ICONS: Record<QrTypeId, LucideIcon> = {
  url: Link2,
  text: Type,
  wifi: Wifi,
  contact: Contact,
  email: Mail,
  phone: Phone,
  sms: MessageSquareText,
};
