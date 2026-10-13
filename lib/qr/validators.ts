import { normalizePhone, normalizeUrl } from "./normalize";
import type {
  ContactValues,
  EmailValues,
  FieldErrors,
  PhoneValues,
  SmsValues,
  TextValues,
  UrlValues,
  WifiValues,
} from "./types";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  const digits = normalizePhone(value).replace("+", "");
  return digits.length >= 3 && digits.length <= 15;
}

export function isValidUrl(value: string): boolean {
  const normalized = normalizeUrl(value);
  if (!normalized) return false;
  try {
    const url = new URL(normalized);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.hostname === "localhost" || /\.[a-z\d-]{2,}$/i.test(url.hostname);
    }
    return true;
  } catch {
    return false;
  }
}

const REQUIRED = "This field is required";

export function validateUrl({ url }: UrlValues): FieldErrors<UrlValues> {
  if (!url.trim()) return { url: REQUIRED };
  if (!isValidUrl(url)) return { url: "Enter a web address, like example.com" };
  return {};
}

export function validateText({ text }: TextValues): FieldErrors<TextValues> {
  return text.trim() ? {} : { text: REQUIRED };
}

export function validateWifi({ ssid, password, security }: WifiValues): FieldErrors<WifiValues> {
  const errors: FieldErrors<WifiValues> = {};
  if (!ssid) errors.ssid = "Enter the network name";
  if (security === "WPA" && password && password.length < 8) {
    errors.password = "WPA passwords are at least 8 characters";
  }
  if (security !== "nopass" && !password) errors.password = "Enter the network password";
  return errors;
}

export function validateContact(values: ContactValues): FieldErrors<ContactValues> {
  const errors: FieldErrors<ContactValues> = {};
  const hasAny = Object.values(values).some((value) => value.trim());
  if (!hasAny) errors.firstName = "Add at least a name, phone number or email";
  if (values.email.trim() && !isValidEmail(values.email)) errors.email = "Enter a valid email";
  if (values.phone.trim() && !isValidPhone(values.phone)) errors.phone = "Enter a valid phone";
  if (values.website.trim() && !isValidUrl(values.website)) {
    errors.website = "Enter a web address, like example.com";
  }
  return errors;
}

export function validateEmail({ to }: EmailValues): FieldErrors<EmailValues> {
  if (!to.trim()) return { to: REQUIRED };
  if (!isValidEmail(to)) return { to: "Enter a valid email, like name@example.com" };
  return {};
}

export function validatePhone({ phone }: PhoneValues): FieldErrors<PhoneValues> {
  if (!phone.trim()) return { phone: REQUIRED };
  if (!isValidPhone(phone)) return { phone: "Enter a valid phone number" };
  return {};
}

export function validateSms({ phone }: SmsValues): FieldErrors<SmsValues> {
  if (!phone.trim()) return { phone: REQUIRED };
  if (!isValidPhone(phone)) return { phone: "Enter a valid phone number" };
  return {};
}
