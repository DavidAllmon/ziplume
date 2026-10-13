"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { niceTicks, type DayPoint } from "@/lib/analytics/shape";

const H = 230;
const M = { top: 12, right: 8, bottom: 26, left: 40 };
const PH = H - M.top - M.bottom;
const fmt = new Intl.NumberFormat("en");

function dayLabel(day: string, weekly: boolean, long = false) {
  const date = new Date(`${day}T12:00:00Z`);
  const text = date.toLocaleDateString("en", {
    month: "short",
    day: "numeric",
    ...(long && { year: "numeric" }),
    timeZone: "UTC",
  });
  return weekly && long ? `Week of ${text}` : text;
}

/**
 * Scans per day (or week) as bars. Unique visitors are in the tooltip and table rather than a
 * second series: most QR scans are one per person, so the two would sit on top of each other.
 */
export function DailyChart({ points, weekly }: { points: DayPoint[]; weekly: boolean }) {
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  // Drawn at the container's real width so axis text stays at 11px on phones.
  const [W, setW] = useState(720);
  const frame = useRef<HTMLDivElement>(null);
  const tableId = useId();

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setW(Math.max(240, Math.round(entry.contentRect.width)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const PW = W - M.left - M.right;
  const n = Math.max(points.length, 1);
  const ticks = niceTicks(Math.max(...points.map((p) => p.scans), 0));
  const top = ticks.at(-1) ?? 1;
  const band = PW / n;
  const barW = Math.max(1, band > 6 ? Math.min(band - 2, 36) : band * 0.75);
  const x = (i: number) => M.left + i * band + band / 2;
  const y = (v: number) => M.top + PH - (v / top) * PH;
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(PW / 72))));
  const point = active !== null ? points[active] : undefined;

  function bar(i: number, value: number) {
    const h = (value / top) * PH;
    if (h <= 0) return null;
    const left = x(i) - barW / 2;
    const base = M.top + PH;
    const r = Math.min(4, barW / 2, h);
    return (
      <path
        key={i}
        d={`M${left},${base} V${base - h + r} Q${left},${base - h} ${left + r},${base - h} H${left + barW - r} Q${left + barW},${base - h} ${left + barW},${base - h + r} V${base} Z`}
        fill="var(--chart-1)"
        opacity={active === null || active === i ? 1 : 0.55}
      />
    );
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowRight") setActive((a) => Math.min(n - 1, (a ?? -1) + 1));
    else if (event.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? n) - 1));
    else if (event.key === "Escape") setActive(null);
    else return;
    event.preventDefault();
  }

  const total = points.reduce((s, p) => s + p.scans, 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button
          type="button"
          className="text-sm font-medium text-link underline-offset-4 hover:underline"
          aria-expanded={showTable}
          aria-controls={tableId}
          onClick={() => setShowTable((v) => !v)}
        >
          {showTable ? "Hide table" : "Show as table"}
        </button>
      </div>

      <div
        ref={frame}
        className="relative overflow-hidden rounded-control focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        tabIndex={0}
        role="group"
        aria-label={`Scans per ${weekly ? "week" : "day"}: ${fmt.format(total)} in this range. Use the arrow keys to read each ${weekly ? "week" : "day"}.`}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
        onPointerLeave={() => setActive(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block" aria-hidden>
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={M.left}
                x2={W - M.right}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text
                x={M.left - 8}
                y={y(t)}
                dy="0.32em"
                textAnchor="end"
                fontSize={11}
                fill="var(--fg-muted)"
                className="tabular-nums"
              >
                {fmt.format(t)}
              </text>
            </g>
          ))}
          {points.map((p, i) => bar(i, p.scans))}
          {points.map((p, i) =>
            i % labelEvery === 0 ? (
              <text
                key={p.day}
                x={x(i)}
                y={H - 6}
                textAnchor="middle"
                fontSize={11}
                fill="var(--fg-muted)"
              >
                {dayLabel(p.day, weekly)}
              </text>
            ) : null,
          )}
          {points.map((p, i) => (
            <rect
              key={`hit-${p.day}`}
              x={M.left + i * band}
              y={M.top}
              width={band}
              height={PH}
              fill="transparent"
              onPointerEnter={() => setActive(i)}
            />
          ))}
        </svg>

        {point && active !== null && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-36 -translate-x-1/2 rounded-control border border-border bg-surface px-3 py-2 text-sm shadow-pop"
            style={{ left: `${Math.min(88, Math.max(12, (x(active) / W) * 100))}%` }}
            role="status"
          >
            <p className="font-semibold text-fg">{dayLabel(point.day, weekly, true)}</p>
            <p className="flex items-center gap-2 text-fg-muted">
              <span className="size-2.5 rounded-sm bg-chart-1" />
              <strong className="text-fg tabular-nums">{fmt.format(point.scans)}</strong> scans
            </p>
            <p className="pl-[1.125rem] text-fg-muted">
              <strong className="text-fg tabular-nums">{fmt.format(point.unique)}</strong> unique
              {weekly ? " (daily, summed)" : " visitors"}
            </p>
          </div>
        )}
      </div>

      {showTable && (
        <div id={tableId} className="max-h-72 overflow-auto rounded-control border border-border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface-2 text-left text-fg-muted">
              <tr>
                <th className="px-3 py-2 font-medium">{weekly ? "Week of" : "Day"}</th>
                <th className="px-3 py-2 text-right font-medium">Scans</th>
                <th className="px-3 py-2 text-right font-medium">Unique</th>
              </tr>
            </thead>
            <tbody>
              {[...points].reverse().map((p) => (
                <tr key={p.day} className="border-t border-border">
                  <td className="px-3 py-1.5 text-fg">{dayLabel(p.day, false, true)}</td>
                  <td className="px-3 py-1.5 text-right text-fg tabular-nums">
                    {fmt.format(p.scans)}
                  </td>
                  <td className="px-3 py-1.5 text-right text-fg-muted tabular-nums">
                    {fmt.format(p.unique)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
