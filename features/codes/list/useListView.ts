"use client";

import { useCallback, useSyncExternalStore } from "react";

export type ListView = "list" | "grid";

const EVENT = "quickqreate:codes-view";
const keyFor = (userId: string) => `quickqreate:codes-view:${userId}`;

function read(userId: string): ListView {
  try {
    return window.localStorage.getItem(keyFor(userId)) === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** List or grid, remembered on this device for this person (spec §4.1). */
export function useListView(userId: string): [ListView, (view: ListView) => void] {
  const view = useSyncExternalStore(
    subscribe,
    () => read(userId),
    () => "list" as const,
  );
  const setView = useCallback(
    (next: ListView) => {
      try {
        window.localStorage.setItem(keyFor(userId), next);
      } catch {
        // Storage is unavailable; the choice lasts until the page closes.
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [userId],
  );
  return [view, setView];
}
