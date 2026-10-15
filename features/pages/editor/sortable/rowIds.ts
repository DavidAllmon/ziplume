import { useState } from "react";

let last = 0;

/** A key for a new row, unique in this tab. */
export const newRowId = () => `row-${++last}`;

/**
 * Keys for a list's rows that stay with each row while it moves, so its fields, focus and drag
 * follow it. The list's own changes (add, move, remove) set them; when the list changes length
 * from outside (Discard, a restored draft), keys are made again to match.
 */
export function useRowIds(count: number): [string[], (ids: string[]) => void] {
  const [ids, setIds] = useState<string[]>(() => Array.from({ length: count }, newRowId));
  if (ids.length !== count) {
    const next = Array.from({ length: count }, (_, i) => ids[i] ?? newRowId());
    setIds(next);
    return [next, setIds];
  }
  return [ids, setIds];
}
