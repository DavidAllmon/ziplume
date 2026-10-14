import { PAGE_TYPES } from "@/lib/pages/types";
import { codeTypeInfo } from "@/lib/qr/code-types";
import {
  isPageType,
  PAGE_TYPE_IDS,
  QR_TYPE_IDS,
  type CodeTypeId,
  type QrTypeId,
} from "@/lib/qr/types";

/** One line for each static type (hosted pages describe themselves in PAGE_TYPES). */
const STATIC_DESCRIPTIONS: Record<QrTypeId, string> = {
  url: "Open a website",
  text: "Show a short note",
  wifi: "Join a Wi-Fi network",
  contact: "Share contact details",
  email: "Write an email",
  phone: "Call a number",
  sms: "Send a text message",
  whatsapp: "Start a WhatsApp chat",
  location: "Open a place on a map",
  payment: "Send a payment",
};

/** The eight types most people need, shown as tiles. Contact covers both contact kinds. */
export const COMMON_TYPES: readonly CodeTypeId[] = [
  "url",
  "links",
  "wifi",
  "contact",
  "pdf",
  "menu",
  "text",
  "email",
];

/** Contact is one choice with two kinds: a card saved straight to the phone, or a hosted page. */
export const isContactType = (id: CodeTypeId) => id === "contact" || id === "vcard";

/** The tile a type belongs to: both contact kinds show as Contact. */
export const tileFor = (id: CodeTypeId): CodeTypeId => (id === "vcard" ? "contact" : id);

/** "Contact" for both contact kinds; otherwise the type's own name. */
export const typeLabel = (id: CodeTypeId) =>
  isContactType(id) ? "Contact" : codeTypeInfo(id).label;

export function typeDescription(id: CodeTypeId): string {
  return isPageType(id) ? PAGE_TYPES[id].description : STATIC_DESCRIPTIONS[id];
}

export interface TypeGroup {
  title: string;
  ids: CodeTypeId[];
}

/** Every type for "More types", grouped, filtered by a search. Contact appears once. */
export function moreTypes(query: string): TypeGroup[] {
  const needle = query.trim().toLowerCase();
  const matches = (id: CodeTypeId) =>
    !needle || `${typeLabel(id)} ${typeDescription(id)}`.toLowerCase().includes(needle);
  const groups: TypeGroup[] = [
    { title: "Works without internet", ids: QR_TYPE_IDS.filter(matches) },
    { title: "Hosted pages", ids: PAGE_TYPE_IDS.filter((id) => id !== "vcard" && matches(id)) },
  ];
  return groups.filter((group) => group.ids.length > 0);
}
