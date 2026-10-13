import {
  encodeContact,
  encodeEmail,
  encodePhone,
  encodeSms,
  encodeText,
  encodeUrl,
  encodeWifi,
} from "./encoders";
import { normalizeUrl } from "./normalize";
import type { ContentValues, FieldErrors, QrTypeId } from "./types";
import {
  validateContact,
  validateEmail,
  validatePhone,
  validateSms,
  validateText,
  validateUrl,
  validateWifi,
} from "./validators";

export interface QrTypeDefinition<K extends QrTypeId> {
  id: K;
  label: string;
  /** Status line shown before the user has entered anything. */
  emptyHint: string;
  defaults: ContentValues[K];
  encode: (values: ContentValues[K]) => string;
  validate: (values: ContentValues[K]) => FieldErrors<ContentValues[K]>;
  /** Short human summary of the payload, e.g. "HomeNet · WPA". */
  summary: (values: ContentValues[K]) => string;
  /** Text used to build a readable download filename. */
  filenameLabel: (values: ContentValues[K]) => string;
}

export type QrTypeRegistry = { [K in QrTypeId]: QrTypeDefinition<K> };

const hostOf = (value: string) => {
  try {
    return new URL(normalizeUrl(value)).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
};

const truncate = (value: string, max = 40) =>
  value.length > max ? `${value.slice(0, max - 1)}…` : value;

export const QR_TYPES: QrTypeRegistry = {
  url: {
    id: "url",
    label: "Link",
    emptyHint: "Add a link to start",
    defaults: { url: "" },
    encode: encodeUrl,
    validate: validateUrl,
    summary: ({ url }) => truncate(normalizeUrl(url).replace(/^https?:\/\//, "")),
    filenameLabel: ({ url }) => hostOf(url),
  },
  text: {
    id: "text",
    label: "Text",
    emptyHint: "Type some text to start",
    defaults: { text: "" },
    encode: encodeText,
    validate: validateText,
    summary: ({ text }) => truncate(text.replace(/\s+/g, " ").trim()),
    filenameLabel: ({ text }) => text.slice(0, 24),
  },
  wifi: {
    id: "wifi",
    label: "Wi-Fi",
    emptyHint: "Add your network name to start",
    defaults: { ssid: "", password: "", security: "WPA", hidden: false },
    encode: encodeWifi,
    validate: validateWifi,
    summary: ({ ssid, security }) =>
      [truncate(ssid, 28), security === "nopass" ? "Open" : security].join(" · "),
    filenameLabel: ({ ssid }) => ssid,
  },
  contact: {
    id: "contact",
    label: "Contact",
    emptyHint: "Add a name to start",
    defaults: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      company: "",
      title: "",
      website: "",
    },
    encode: encodeContact,
    validate: validateContact,
    summary: (v) =>
      truncate(
        [`${v.firstName} ${v.lastName}`.trim(), v.company].filter(Boolean).join(" · ") ||
          v.email ||
          v.phone,
      ),
    filenameLabel: (v) => `${v.firstName} ${v.lastName}`.trim() || v.company,
  },
  email: {
    id: "email",
    label: "Email",
    emptyHint: "Add an email address to start",
    defaults: { to: "", subject: "", body: "" },
    encode: encodeEmail,
    validate: validateEmail,
    summary: ({ to, subject }) => truncate([to.trim(), subject.trim()].filter(Boolean).join(" · ")),
    filenameLabel: ({ to }) => to.split("@")[0] ?? "",
  },
  phone: {
    id: "phone",
    label: "Phone",
    emptyHint: "Add a phone number to start",
    defaults: { phone: "" },
    encode: encodePhone,
    validate: validatePhone,
    summary: ({ phone }) => phone.trim(),
    filenameLabel: ({ phone }) => phone,
  },
  sms: {
    id: "sms",
    label: "SMS",
    emptyHint: "Add a phone number to start",
    defaults: { phone: "", message: "" },
    encode: encodeSms,
    validate: validateSms,
    summary: ({ phone, message }) =>
      truncate([phone.trim(), message.trim()].filter(Boolean).join(" · ")),
    filenameLabel: ({ phone }) => phone,
  },
};

/** Type-safe helpers so callers don't need to narrow the registry entry themselves. */
export function encodeContent<K extends QrTypeId>(type: K, values: ContentValues[K]): string {
  return QR_TYPES[type].encode(values);
}

export function validateContent<K extends QrTypeId>(
  type: K,
  values: ContentValues[K],
): FieldErrors<ContentValues[K]> {
  return QR_TYPES[type].validate(values);
}

export function summarizeContent<K extends QrTypeId>(type: K, values: ContentValues[K]): string {
  return QR_TYPES[type].summary(values);
}

export function filenameLabelFor<K extends QrTypeId>(type: K, values: ContentValues[K]): string {
  return QR_TYPES[type].filenameLabel(values);
}
