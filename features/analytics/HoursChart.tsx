"use client";

import { useState } from "react";

const fmt = new Intl.NumberFormat("en");
const hourLabel = (h: number, short = false) =>
  short
    ? `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "a" : "p"}`
    : `${h % 12 === 0 ? 12 : h % 12} ${h < 12 ? "AM" : "PM"}`;

/** Scans by hour of day (viewer's time zone), as 24 bars. */
export function HoursChart({ hours }: { hours: { hour: number; scans: number }[] }) {
  const [active, setActive] = useState<number | null>(null);
  const counts = Array.from({ length: 24 }, (_, h) => hours.find((x) => x.hour === h)?.scans ?? 0);
  const max = Math.max(...counts, 1);
  const busiest = counts.indexOf(Math.max(...counts));

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex h-32 items-end gap-0.5" onPointerLeave={() => setActive(null)}>
        {counts.map((count, h) => (
          <button
            key={h}
            type="button"
            className="group relative flex h-full flex-1 items-end focus-visible:outline-2 focus-visible:outline-ring"
            aria-label={`${hourLabel(h)}: ${fmt.format(count)} scans`}
            onPointerEnter={() => setActive(h)}
            onFocus={() => setActive(h)}
            onBlur={() => setActive(null)}
          >
            <span
              className="block w-full rounded-t-[4px] bg-chart-1 transition-opacity"
              style={{
                height: `${(count / max) * 100}%`,
                opacity: active === null || active === h ? 1 : 0.55,
              }}
            />
          </button>
        ))}
        {active !== null && (
          <div
            role="status"
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-control border border-border bg-surface px-3 py-1.5 text-sm whitespace-nowrap shadow-pop"
            style={{ left: `${((active + 0.5) / 24) * 100}%` }}
          >
            <strong className="text-fg tabular-nums">{fmt.format(counts[active] ?? 0)}</strong>{" "}
            <span className="text-fg-muted">scans at {hourLabel(active)}</span>
          </div>
        )}
      </div>
      <div className="flex justify-between text-xs text-fg-muted" aria-hidden>
        {[0, 6, 12, 18, 23].map((h) => (
          <span key={h}>{hourLabel(h, true)}</span>
        ))}
      </div>
      {counts[busiest]! > 0 && (
        <p className="text-sm text-fg-muted">
          Busiest hour: <strong className="text-fg">{hourLabel(busiest)}</strong>
        </p>
      )}
    </div>
  );
}
