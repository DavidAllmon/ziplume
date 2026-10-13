import { normalizePhone, normalizeUrl } from "./normalize";
import { cleanAccount } from "./encoders";
import type {
  ContactValues,
  EmailValues,
  FieldErrors,
  LocationValues,
  PaymentMethod,
  PaymentValues,
  PhoneValues,
  SmsValues,
  TextValues,
  UrlValues,
  WhatsAppValues,
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

export function validateWhatsApp({ phone }: WhatsAppValues): FieldErrors<WhatsAppValues> {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return { phone: REQUIRED };
  if (digits.length < 7 || digits.length > 15) {
    return { phone: "Enter the full number with country code, like +1 555 010 9999" };
  }
  return {};
}

const isCoordinate = (value: string, limit: number) =>
  /^-?\d{1,3}(\.\d+)?$/.test(value.trim()) && Math.abs(Number(value)) <= limit;

export function validateLocation(values: LocationValues): FieldErrors<LocationValues> {
  if (values.mode === "address") return values.query.trim() ? {} : { query: REQUIRED };
  const errors: FieldErrors<LocationValues> = {};
  if (!isCoordinate(values.latitude, 90)) errors.latitude = "A number from -90 to 90";
  if (!isCoordinate(values.longitude, 180)) errors.longitude = "A number from -180 to 180";
  return errors;
}

const ACCOUNT_RULES: Record<PaymentMethod, { pattern: RegExp; message: string }> = {
  paypal: { pattern: /^[A-Za-z0-9]{1,20}$/, message: "Your PayPal.me name: letters and numbers" },
  venmo: { pattern: /^[A-Za-z0-9_-]{5,30}$/, message: "Your Venmo username, 5–30 characters" },
  cashapp: {
    pattern: /^(?=.*[A-Za-z])[A-Za-z0-9]{1,20}$/,
    message: "Your $cashtag: up to 20 letters and numbers",
  },
  bitcoin: {
    pattern: /^(bc1[02-9ac-hj-np-z]{11,71}|[13][1-9A-HJ-NP-Za-km-z]{25,34})$/,
    message: "Enter a valid Bitcoin address",
  },
  ethereum: { pattern: /^0x[0-9a-fA-F]{40}$/, message: "Enter a valid 0x… Ethereum address" },
};

export function validatePayment(values: PaymentValues): FieldErrors<PaymentValues> {
  const errors: FieldErrors<PaymentValues> = {};
  const account = cleanAccount(values.account);
  if (!account) errors.account = REQUIRED;
  else if (!ACCOUNT_RULES[values.method].pattern.test(account)) {
    errors.account = ACCOUNT_RULES[values.method].message;
  }
  const amount = values.amount.trim();
  const crypto = values.method === "bitcoin" || values.method === "ethereum";
  if (amount) {
    const pattern = crypto ? /^\d+(\.\d{1,18})?$/ : /^\d+(\.\d{1,2})?$/;
    if (!pattern.test(amount) || Number(amount) <= 0) {
      errors.amount = crypto ? "A positive amount, like 0.005" : "A positive amount, like 12.50";
    }
  }
  return errors;
}
