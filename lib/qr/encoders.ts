import { escapeVCard, escapeWifi } from "./escape";
import { normalizePhone, normalizeUrl } from "./normalize";
import type {
  ContactValues,
  EmailValues,
  LocationValues,
  PaymentValues,
  PhoneValues,
  SmsValues,
  TextValues,
  UrlValues,
  WhatsAppValues,
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

/** wa.me wants the full international number as digits only, without "+" or spaces. */
export function encodeWhatsApp({ phone, message }: WhatsAppValues): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  const text = message.trim() ? `?text=${encodeURIComponent(message.trim())}` : "";
  return `https://wa.me/${digits}${text}`;
}

/** A Google Maps link: it opens the Maps app on iPhone and Android, and the web elsewhere. */
export function encodeLocation({ mode, query, latitude, longitude }: LocationValues): string {
  const target =
    mode === "coordinates"
      ? latitude.trim() && longitude.trim()
        ? `${Number(latitude)},${Number(longitude)}`
        : ""
      : query.trim();
  if (!target) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(target)}`;
}

/** Converts a decimal amount (e.g. "0.05") to an integer string in the smallest unit. */
export function toBaseUnits(amount: string, decimals: number): string {
  const [whole = "0", fraction = ""] = amount.trim().split(".");
  const digits = `${whole}${fraction.padEnd(decimals, "0").slice(0, decimals)}`.replace(
    /^0+(?=\d)/,
    "",
  );
  return digits || "0";
}

export const cleanAccount = (account: string) => account.trim().replace(/^[@$]/, "");

export function encodePayment({ method, account, amount, currency, note }: PaymentValues): string {
  const id = cleanAccount(account);
  if (!id) return "";
  const value = amount.trim();
  switch (method) {
    case "paypal":
      return `https://paypal.me/${id}${value ? `/${value}${currency}` : ""}`;
    case "venmo": {
      const params = new URLSearchParams({ txn: "pay" });
      if (value) params.set("amount", value);
      if (note.trim()) params.set("note", note.trim());
      return `https://venmo.com/${id}?${params.toString()}`;
    }
    case "cashapp":
      return `https://cash.app/$${id}${value ? `/${value}` : ""}`;
    case "bitcoin": {
      // BIP 21: amounts are in BTC; message is shown to the payer.
      const params: string[] = [];
      if (value) params.push(`amount=${value}`);
      if (note.trim()) params.push(`message=${encodeURIComponent(note.trim())}`);
      return `bitcoin:${id}${params.length ? `?${params.join("&")}` : ""}`;
    }
    case "ethereum":
      // EIP-681: value is in wei.
      return `ethereum:${id}${value ? `?value=${toBaseUnits(value, 18)}` : ""}`;
  }
}
