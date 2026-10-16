import type { ReactNode } from "react";

// Web addresses with a scheme or "www.", and email addresses. A bare "example.org" stays text,
// so sentences like "Version 2.0" are never linked. Curly quotes end an address. The email part
// can't start inside a word, which keeps it linear on long runs of letters.
const PATTERN =
  /(https?:\/\/[^\s<>"“”‘’]+)|(www\.[^\s<>"“”‘’]+)|(?<![A-Z0-9._%+-])([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;
// Punctuation that ends a sentence, not an address.
const TRAILING = /[.,;:!?'"…»›]/;
const OPENS: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
const count = (text: string, char: string) => text.split(char).length - 1;

/** A match without trailing punctuation, or a closing bracket it didn't open. */
function trim(match: string): string {
  let text = match;
  for (;;) {
    const last = text.at(-1) ?? "";
    const open = OPENS[last];
    if (TRAILING.test(last) || (open && count(text, last) > count(text, open))) {
      text = text.slice(0, -1);
    } else {
      return text;
    }
  }
}

function hrefFor(text: string, email: boolean): string | null {
  if (email) return `mailto:${text}`;
  const url = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  try {
    // Checked, but kept as written (URL would add a trailing slash to a bare host).
    const { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}

/** Page text with its web and email addresses as links (spec item 54). */
export function linkify(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(PATTERN)) {
    const start = match.index;
    const email = match[3] !== undefined;
    const shown = email ? match[0] : trim(match[0]);
    const href = shown ? hrefFor(shown, email) : null;
    if (!href) continue;
    if (start > last) out.push(text.slice(last, start));
    out.push(
      <a
        key={start}
        href={href}
        target="_blank"
        rel="noopener noreferrer nofollow ugc"
        className="font-medium wrap-anywhere text-fg underline underline-offset-4"
      >
        {shown}
      </a>,
    );
    last = start + shown.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
