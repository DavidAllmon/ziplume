"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * False on the server and while the page hydrates, true in the browser after that. Use it for
 * anything the server can't know, like the viewer's time zone, so the HTML matches while hydrating.
 */
export function useInBrowser(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
