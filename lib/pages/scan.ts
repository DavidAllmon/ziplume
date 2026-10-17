import qrcode from "qrcode-generator";

import { detectMode, toUtf8BinaryString } from "@/lib/qr/utf8";

// The coupon code drawn for a till's scanner (spec item 26): a QR code, or a Code 128 barcode.

/** The QR code's dark modules, encoded the way the app's own QR codes are (UTF-8). */
export function qrModules(value: string): boolean[][] {
  const encoded = toUtf8BinaryString(value);
  const code = qrcode(0, "M");
  code.addData(encoded, detectMode(encoded));
  code.make();
  const n = code.getModuleCount();
  return Array.from({ length: n }, (_, r) =>
    Array.from({ length: n }, (_, c) => code.isDark(r, c)),
  );
}

// prettier-ignore
/** Code 128's bar-and-space widths by value: 0–102 data, 103–105 Start A/B/C, 106 Stop. */
export const CODE128 = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];
const START_B = 104;
const STOP = 106;
const MAX = 20;

/** Why a code can't be a barcode, or null when it can. */
export function barcodeProblem(value: string): string | null {
  return /^[\x20-\x7E]{1,20}$/.test(value)
    ? null
    : `A barcode holds up to ${MAX} letters, numbers and symbols, without accents. Use a QR code for this one.`;
}

/** The barcode's widths in modules, bars and spaces in turn (bar first), or null if it can't be one. */
export function code128Widths(value: string): number[] | null {
  if (barcodeProblem(value)) return null;
  const values = [...value].map((ch) => ch.charCodeAt(0) - 32);
  const check = values.reduce((sum, v, i) => sum + v * (i + 1), START_B) % 103;
  return [START_B, ...values, check, STOP].flatMap((v) => [...CODE128[v]!].map(Number));
}
