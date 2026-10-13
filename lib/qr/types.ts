/** Codes that encode their content directly (no account needed). */
export const QR_TYPE_IDS = [
  "url",
  "text",
  "wifi",
  "contact",
  "email",
  "phone",
  "sms",
  "whatsapp",
  "location",
  "payment",
] as const;
export type QrTypeId = (typeof QR_TYPE_IDS)[number];

/** Codes that open a mobile page hosted by QuickQReate (free account needed). */
export const PAGE_TYPE_IDS = [
  "links",
  "vcard",
  "business",
  "menu",
  "coupon",
  "event",
  "feedback",
  "pdf",
  "images",
  "video",
  "audio",
  "app",
] as const;
export type PageTypeId = (typeof PAGE_TYPE_IDS)[number];

export type CodeTypeId = QrTypeId | PageTypeId;

export const isPageType = (value: string): value is PageTypeId =>
  (PAGE_TYPE_IDS as readonly string[]).includes(value);

export const isStaticType = (value: string): value is QrTypeId =>
  (QR_TYPE_IDS as readonly string[]).includes(value);

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

export interface WhatsAppValues {
  phone: string;
  message: string;
}

export type LocationMode = "address" | "coordinates";

export interface LocationValues {
  mode: LocationMode;
  query: string;
  latitude: string;
  longitude: string;
}

export const PAYMENT_METHODS = ["paypal", "venmo", "cashapp", "bitcoin", "ethereum"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface PaymentValues {
  method: PaymentMethod;
  /** Username, cashtag or wallet address, depending on the method. */
  account: string;
  amount: string;
  /** ISO currency for PayPal (empty = the recipient's default). */
  currency: string;
  note: string;
}

export interface ContentValues {
  url: UrlValues;
  text: TextValues;
  wifi: WifiValues;
  contact: ContactValues;
  email: EmailValues;
  phone: PhoneValues;
  sms: SmsValues;
  whatsapp: WhatsAppValues;
  location: LocationValues;
  payment: PaymentValues;
}

/** Field-level validation messages, keyed by field name. Empty object = valid. */
export type FieldErrors<V> = Partial<Record<keyof V, string>>;

export const DOT_STYLE_IDS = ["square", "rounded", "fluid", "dots", "classy", "leaf"] as const;
export type DotStyle = (typeof DOT_STYLE_IDS)[number];

export const CORNER_STYLE_IDS = ["square", "rounded", "dot", "classy", "leaf"] as const;
export type CornerStyle = (typeof CORNER_STYLE_IDS)[number];

/** Shape of the three corner centers; "auto" matches the corner frame. */
export const CORNER_DOT_STYLE_IDS = ["auto", "square", "rounded", "dot", "classy"] as const;
export type CornerDotStyle = (typeof CORNER_DOT_STYLE_IDS)[number];

export const GRADIENT_TYPE_IDS = ["none", "linear", "radial"] as const;
export type GradientType = (typeof GRADIENT_TYPE_IDS)[number];

export const FRAME_STYLE_IDS = ["none", "bottom", "top", "badge", "bubble"] as const;
export type FrameStyle = (typeof FRAME_STYLE_IDS)[number];

export const EXPORT_FORMAT_IDS = ["png", "svg", "jpeg", "webp", "pdf", "eps"] as const;
export type ExportFormat = (typeof EXPORT_FORMAT_IDS)[number];

/** Formats drawn as vectors: their pixel size doesn't matter. */
export const VECTOR_FORMATS: readonly ExportFormat[] = ["svg", "pdf", "eps"];
