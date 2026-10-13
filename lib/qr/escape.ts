/** Escapes a value for the `WIFI:` payload (ZXing spec): \ ; , : " must be backslash-escaped. */
export function escapeWifi(value: string): string {
  return value.replace(/([\\;,:"])/g, "\\$1");
}

/** Escapes a vCard 3.0 text value (RFC 2426 §4): backslash, comma, semicolon and newlines. */
export function escapeVCard(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\r\n|\r|\n/g, "\\n");
}
