"use client";

import { useSyncExternalStore, type ReactNode } from "react";

import type { Breakdown } from "@/lib/analytics/shape";

import type { BreakdownItem } from "./BreakdownList";

export const DEVICE_LABELS: Record<string, string> = {
  mobile: "Phone",
  tablet: "Tablet",
  desktop: "Computer",
  other: "Other",
};

const noSubscribe = () => () => {};

function viewerTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/**
 * The viewer's time zone. The server can't know it, so it renders without one (null) and the
 * browser fills it in after hydration.
 */
export function useViewerTimeZone(): string | null {
  return useSyncExternalStore(noSubscribe, viewerTimeZone, () => null);
}

export const toItems = (
  rows: Breakdown[],
  map: (row: Breakdown) => Omit<BreakdownItem, "scans">,
): BreakdownItem[] => rows.map((row) => ({ ...map(row), scans: Number(row.scans) }));

export function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 rounded-card border border-border bg-surface px-4 py-3.5 shadow-card">
      <span className="text-sm text-fg-muted">{label}</span>
      <span className="truncate font-display text-2xl font-bold tracking-tight text-fg tabular-nums">
        {value}
      </span>
      {detail && <span className="truncate text-xs text-fg-muted">{detail}</span>}
    </div>
  );
}
