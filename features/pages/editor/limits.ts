"use client";

import { createContext, useContext } from "react";

import { shortenBy } from "@/lib/pages/sanitize";

/** A text field's limit by its path; PageEditor provides it from the page's schema. */
export const LimitsContext = createContext<(path: string) => number | null>(() => null);

export const useLimit = (path: string) => useContext(LimitsContext)(path);

const count = (n: number) => n.toLocaleString("en-US");

/** The counter under a box ("245 / 1,000") and, over the limit, the error to show. */
export function limitNote(
  length: number,
  limit: number | null,
  multiline: boolean,
): { counter: string | null; error: string | null } {
  if (limit === null) return { counter: null, error: null };
  const over = length - limit;
  // Small boxes (a price, a currency, a label) stay quiet until they're too long.
  const near = multiline || (limit >= 30 && length >= limit - 20);
  return {
    counter: near || over > 0 ? `${count(length)} / ${count(limit)}` : null,
    error: over > 0 ? shortenBy(over) : null,
  };
}
