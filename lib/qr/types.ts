export const QR_TYPE_IDS = ["url", "text", "wifi", "contact", "email", "phone", "sms"] as const;
export type QrTypeId = (typeof QR_TYPE_IDS)[number];

export type ErrorCorrection = "L" | "M" | "Q" | "H";

export type WifiSecurity = "WPA" | "WEP" | "nopass";

export interface UrlValues {
  url: string;
}

export interface TextValues {
  text: string;
}

export interface WifiValues {
  ssid: string;
  password: string;
  security: WifiSecurity;
  hidden: boolean;
}

export interface ContactValues {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  company: string;
  title: string;
  website: string;
}

export interface EmailValues {
  to: string;
  subject: string;
  body: string;
}

export interface PhoneValues {
  phone: string;
}

export interface SmsValues {
  phone: string;
  message: string;
}

export interface ContentValues {
  url: UrlValues;
  text: TextValues;
  wifi: WifiValues;
  contact: ContactValues;
  email: EmailValues;
  phone: PhoneValues;
  sms: SmsValues;
}

/** Field-level validation messages, keyed by field name. Empty object = valid. */
export type FieldErrors<V> = Partial<Record<keyof V, string>>;

export type DotStyle = "square" | "rounded" | "dots" | "classy";
export type CornerStyle = "square" | "rounded" | "dot";
export type ExportFormat = "png" | "svg" | "jpeg" | "webp";
