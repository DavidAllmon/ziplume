const HIERARCHICAL_SCHEME = /^[a-z][a-z\d+.-]*:\/\//i;
const KNOWN_SCHEME = /^(mailto|tel|sms|smsto|geo|market|bitcoin|data|spotify|itms-apps|whatsapp):/i;

/** Adds https:// to bare domains ("example.com/path", "localhost:3000") and keeps explicit schemes. */
export function normalizeUrl(input: string): string {
  const value = input.trim();
  if (!value) return "";
  if (HIERARCHICAL_SCHEME.test(value) || KNOWN_SCHEME.test(value)) return value;
  return `https://${value.replace(/^\/+/, "")}`;
}

/** Keeps a leading "+" and digits only: "+1 (555) 010-9999" -> "+15550109999". */
export function normalizePhone(input: string): string {
  const value = input.trim();
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return value.startsWith("+") ? `+${digits}` : digits;
}
