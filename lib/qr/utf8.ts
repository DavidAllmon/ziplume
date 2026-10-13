const encoder = new TextEncoder();

export function utf8ByteLength(value: string): number {
  return encoder.encode(value).length;
}

/**
 * QR byte mode stores raw bytes, but qrcode-generator (and qr-code-styling, which bundles it)
 * converts strings with `charCode & 0xff`, which corrupts anything outside Latin-1.
 * Passing a "binary string" where each char is one UTF-8 byte makes the output correct
 * UTF-8, which every modern scanner decodes.
 */
export function toUtf8BinaryString(value: string): string {
  const bytes = encoder.encode(value);
  let result = "";
  for (const byte of bytes) result += String.fromCharCode(byte);
  return result;
}

/** Mirrors qr-code-styling's automatic mode selection so measurements match the rendered code. */
export function detectMode(value: string): "Numeric" | "Alphanumeric" | "Byte" {
  if (/^[0-9]*$/.test(value)) return "Numeric";
  if (/^[0-9A-Z $%*+\-./:]*$/.test(value)) return "Alphanumeric";
  return "Byte";
}
