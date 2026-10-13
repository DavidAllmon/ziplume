// Advance widths of Helvetica-Bold (and the metric-compatible Arial Bold) for printable
// ASCII, in thousandths of an em, from the standard Adobe font metrics. Frame text is laid
// out with these so it measures the same in the browser, in tests and in PDF/EPS output.
const HELVETICA_BOLD: Record<string, number> = {};
const WIDTHS =
  "278 333 474 556 556 889 722 238 333 333 389 584 278 333 278 278 556 556 556 556 556 556 556 556 556 556 333 333 584 584 584 611 975 722 722 722 722 667 611 778 722 278 556 722 611 833 722 778 667 778 722 667 611 722 667 944 667 667 611 333 278 333 584 556 333 556 611 556 611 556 333 611 611 278 278 556 278 889 611 611 611 611 389 556 333 611 556 778 556 556 500 389 280 389 584";
WIDTHS.split(" ").forEach((width, i) => {
  HELVETICA_BOLD[String.fromCharCode(32 + i)] = Number(width);
});

/** Width of `text` in ems when set in Helvetica-Bold. Unknown characters count as 0.6 em. */
export function textWidthEm(text: string): number {
  let total = 0;
  for (const char of text) {
    const base = char.normalize("NFD")[0] ?? char;
    total +=
      HELVETICA_BOLD[char] ??
      HELVETICA_BOLD[base] ??
      (/\p{Extended_Pictographic}|\p{Script=Han}|\p{Script=Hangul}|\p{Script=Hiragana}|\p{Script=Katakana}/u.test(
        char,
      )
        ? 1000
        : 600);
  }
  return total / 1000;
}

/** True when every character can be drawn with a standard Latin-1 PostScript/PDF font. */
export const isLatin1 = (text: string) =>
  [...text].every((char) => char.charCodeAt(0) <= 0xff && char.length === 1);
