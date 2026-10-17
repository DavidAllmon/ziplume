"use client";

import { openStatus, statusText, zonedNow } from "@/lib/pages/hours";
import type { Closure, DayHours } from "@/lib/pages/types";

import { useMinute } from "./useMinute";

/** "Open now · closes 5:00 PM", worked out in the browser so it's always current (spec item 16). */
export function OpenStatus({
  hours,
  closures,
  timeZone,
}: {
  hours: DayHours[];
  closures: Closure[];
  timeZone: string;
}) {
  const now = useMinute();
  if (now === null) return null;
  const state = openStatus(hours, closures, zonedNow(new Date(now), timeZone));
  if (!state) return null;
  const open = state.kind === "open";
  return (
    <p className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-fg">
      <span
        aria-hidden
        className={
          open ? "size-2.5 rounded-full bg-(--page-accent)" : "size-2.5 rounded-full bg-fg-muted"
        }
      />
      {statusText(state)}
    </p>
  );
}
