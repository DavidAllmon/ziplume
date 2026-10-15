"use client";

import { useCallback, useContext, useState } from "react";

import { RevealErrorsContext } from "./RevealErrors";

/** Tracks which fields the user has left, so errors only appear after a field is visited. */
export function useTouched() {
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());
  const touch = useCallback(
    (field: string) =>
      setTouched((current) => (current.has(field) ? current : new Set(current).add(field))),
    [],
  );
  const reveal = useContext(RevealErrorsContext);
  const errorFor = useCallback(
    (field: string, errors: Partial<Record<string, string>>) =>
      reveal || touched.has(field) ? errors[field] : undefined,
    [touched, reveal],
  );
  return { touch, errorFor };
}
