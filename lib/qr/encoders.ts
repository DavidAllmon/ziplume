import { escapeVCard, escapeWifi } from "./escape";
import { normalizePhone, normalizeUrl } from "./normalize";
import type {
  ContactValues,
  EmailValues,
  PhoneValues,
  SmsValues,
  TextValues,
  UrlValues,
  WifiValues,
} from "./types";

// Every encoder returns "" when there is nothing meaningful to encode yet,
// so the UI can show an empty state instead of a code for placeholder data.

export function encodeUrl({ url }: UrlValues): string {
  return normalizeUrl(url);
}

export function encodeText({ text }: TextValues): string {
  return text.trim() ? text : "";
}

export function encodeWifi({ ssid, password, security, hidden }: WifiValues): string {
  if (!ssid) return "";
  const parts = [`T:${security}`, `S:${escapeWifi(ssid)}`];
  if (security !== "nopass" && password) parts.push(`P:${escapeWifi(password)}`);
  if (hidden) parts.push("H:true");
  return `WIFI:${parts.join(";")};;`;
}

export function encodeContact(values: ContactValues): string {
  const v = Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value.trim()]),
  ) as ContactValues;

  const fullName = [v.firstName, v.lastName].filter(Boolean).join(" ");
  const displayName = fullName || v.company || v.email || normalizePhone(v.phone);
  if (!displayName) return "";

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `N:${escapeVCard(v.lastName)};${escapeVCard(v.firstName)};;;`,
    `FN:${escapeVCard(displayName)}`,
  ];
  if (v.company) lines.push(`ORG:${escapeVCard(v.company)}`);
  if (v.title) lines.push(`TITLE:${escapeVCard(v.title)}`);
  if (v.phone) lines.push(`TEL;TYPE=CELL:${normalizePhone(v.phone)}`);
  if (v.email) lines.push(`EMAIL:${escapeVCard(v.email)}`);
  // URL is a URI value in vCard 3.0, so it is not TEXT-escaped.
  if (v.website) lines.push(`URL:${normalizeUrl(v.website)}`);
  lines.push("END:VCARD");
  // vCard requires CRLF line endings.
  return lines.join("\r\n");
}

export function encodeEmail({ to, subject, body }: EmailValues): string {
  const address = to.trim();
  if (!address) return "";
  const params = [
    subject && `subject=${encodeURIComponent(subject)}`,
    body && `body=${encodeURIComponent(body)}`,
  ].filter(Boolean);
  return `mailto:${address}${params.length ? `?${params.join("&")}` : ""}`;
}

export function encodePhone({ phone }: PhoneValues): string {
  const number = normalizePhone(phone);
  return number ? `tel:${number}` : "";
}

export function encodeSms({ phone, message }: SmsValues): string {
  const number = normalizePhone(phone);
  if (!number) return "";
  return `SMSTO:${number}:${message}`;
}
