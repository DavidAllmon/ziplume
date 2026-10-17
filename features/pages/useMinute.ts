"use client";

import { useSyncExternalStore } from "react";

const subscribe = (tick: () => void) => {
  const id = window.setInterval(tick, 30_000);
  return () => window.clearInterval(id);
};
// The minute, so the snapshot only changes when a countdown's text could.
const minute = () => Math.floor(Date.now() / 60_000);

/** Now, floored to the minute, in the browser; null while rendering on the server. */
export function useMinute(): number | null {
  const now = useSyncExternalStore(subscribe, minute, () => null);
  return now === null ? null : now * 60_000;
}
