"use client";

import { useCallback, useSyncExternalStore } from "react";

const EVENT = "ziplume:remembered";

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Something this phone remembers about a page, such as a coupon it marked used (spec item 29), as
 * the stored text. It's null while rendering on the server, with no key, or when storage is
 * blocked; callers keep their own state for that case.
 */
export function useRemembered(key: string | null): [string | null, (value: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => (key ? read(key) : null),
    () => null,
  );
  const remember = useCallback(
    (next: string) => {
      if (!key) return;
      try {
        window.localStorage.setItem(key, next);
      } catch {
        // Storage is blocked; the caller's own state carries it until the page closes.
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );
  return [value, remember];
}
