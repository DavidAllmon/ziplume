"use client";

import Link from "next/link";
import { useState } from "react";

const fmt = new Intl.NumberFormat("en");

export interface BreakdownItem {
  key: string;
  label: string;
  icon?: string;
  scans: number;
  /** Opens this item, e.g. a code's own analytics. */
  href?: string;
}

/** A ranked list with proportional bars, e.g. countries or browsers. */
export function BreakdownList({
  items,
  total,
  empty,
}: {
  items: BreakdownItem[];
  total: number;
  empty: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) return <p className="text-sm text-fg-muted">{empty}</p>;
  const max = Math.max(...items.map((i) => i.scans), 1);
  const shown = expanded ? items : items.slice(0, 6);

  return (
    <div className="flex flex-col gap-2.5">
      <ul className="flex flex-col gap-2.5">
        {shown.map((item) => (
          <li
            key={item.key}
            className={
              item.href
                ? "relative flex min-h-11 flex-col justify-center gap-1"
                : "flex flex-col gap-1"
            }
          >
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-fg">
                {item.icon && (
                  <span aria-hidden className="mr-1.5">
                    {item.icon}
                  </span>
                )}
                {item.href ? (
                  // The whole row is the target: a phone-sized tap anywhere on it.
                  <Link
                    href={item.href}
                    className="text-link underline-offset-4 after:absolute after:inset-0 hover:underline"
                  >
                    {item.label}
                  </Link>
                ) : (
                  item.label
                )}
              </span>
              <span className="shrink-0 text-fg-muted tabular-nums">
                <strong className="font-semibold text-fg">{fmt.format(item.scans)}</strong>{" "}
                {total > 0 && `· ${Math.round((item.scans / total) * 100)}%`}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
              <div
                className="h-full rounded-full bg-chart-1"
                style={{ width: `${(item.scans / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      {items.length > 6 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="self-start text-sm font-medium text-link underline-offset-4 hover:underline"
        >
          {expanded ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}
    </div>
  );
}
