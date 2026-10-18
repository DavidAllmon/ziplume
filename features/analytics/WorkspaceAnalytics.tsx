"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useState } from "react";

import { withWorkspace } from "@/components/app/nav";
import { buttonClasses } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/inputs";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatCount } from "@/features/dashboard/format";
import {
  RANGES,
  countryFlag,
  countryName,
  customBounds,
  dayInZone,
  fillDays,
  groupByWeek,
  parseWorkspaceAnalytics,
  rangeBounds,
  type RangeKey,
  type WorkspaceAnalyticsData,
} from "@/lib/analytics/shape";
import { getBrowserSupabase } from "@/lib/supabase/client";

import { BreakdownList } from "./BreakdownList";
import { DailyChart } from "./DailyChart";
import { DEVICE_LABELS, StatTile, toItems, useViewerTimeZone } from "./parts";

type Range = RangeKey | "custom";

const RANGE_OPTIONS: { value: Range; label: string; ariaLabel: string }[] = [
  ...RANGES.map((r) => ({
    value: r.value as Range,
    label: r.value === "all" ? "All" : r.value.toUpperCase(),
    ariaLabel: r.label,
  })),
  { value: "custom", label: "Custom", ariaLabel: "Custom dates" },
];

type Result = { key: string; data: WorkspaceAnalyticsData } | { key: string; error: string };

/**
 * Scans across every code in a workspace (redesign spec 4.4): yours, a teammate's, or everyone's
 * you can see (owner null). Row-level security keeps teammates' private codes out.
 */
export function WorkspaceAnalytics({
  owner,
  meId,
  title,
  description,
  since,
  hasCodes,
}: {
  owner: string | null;
  meId: string;
  title: string;
  description: string;
  /** When "All time" starts: the workspace's first trackable code. */
  since: string;
  hasCodes: boolean;
}) {
  const fromId = useId();
  const toId = useId();
  const timeZone = useViewerTimeZone();
  const [now] = useState(() => new Date());
  const [range, setRange] = useState<Range>("30d");
  const [fromDay, setFromDay] = useState(() =>
    dayInZone(new Date(now.getTime() - 29 * 86_400_000), "UTC"),
  );
  const [toDay, setToDay] = useState(() => dayInZone(now, "UTC"));
  const [result, setResult] = useState<Result | null>(null);

  const bounds = useMemo(() => {
    const zone = timeZone ?? "UTC";
    return range === "custom"
      ? customBounds(fromDay, toDay, zone, now)
      : rangeBounds(range, now, new Date(since), zone);
  }, [range, fromDay, toDay, now, since, timeZone]);
  const requestKey = `${range}|${fromDay}|${toDay}|${timeZone}`;

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase || !timeZone || !bounds || !hasCodes) return;
    let cancelled = false;
    void supabase
      .rpc("workspace_analytics", {
        p_owner: owner,
        p_from: bounds.from.toISOString(),
        p_to: bounds.to.toISOString(),
        p_tz: timeZone,
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        setResult(
          error
            ? {
                key: requestKey,
                error: "Couldn't load analytics. Check your connection and try again.",
              }
            : { key: requestKey, data: parseWorkspaceAnalytics(data) },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [owner, bounds, timeZone, hasCodes, requestKey]);

  const loading = hasCodes && bounds !== null && result?.key !== requestKey;
  const data = result && "data" in result && result.key === requestKey ? result.data : null;
  const error = !loading && result && "error" in result ? result.error : null;

  const weekly = bounds ? bounds.to.getTime() - bounds.from.getTime() > 120 * 86_400_000 : false;
  const points = useMemo(() => {
    if (!data || !bounds) return [];
    const days = fillDays(data.daily, bounds.from, bounds.to, timeZone ?? "UTC");
    return weekly ? groupByWeek(days) : days;
  }, [data, bounds, timeZone, weekly]);
  const busiest = data?.daily.reduce<{ day: string; scans: number } | null>(
    (best, d) => (d.scans > (best?.scans ?? 0) ? d : best),
    null,
  );
  const topCountry = data?.countries.find((c) => c.label !== "??");

  const exportParams = new URLSearchParams({ range, tz: timeZone ?? "UTC" });
  if (range === "custom") {
    exportParams.set("from", fromDay);
    exportParams.set("to", toDay);
  }
  if (owner) exportParams.set("workspace", owner);
  else exportParams.set("view", "everyone");
  const exportHref = `/analytics/export?${exportParams.toString()}`;
  const rangeLabel =
    range === "custom"
      ? "Chosen dates"
      : `Last ${RANGES.find((r) => r.value === range)?.label.toLowerCase()}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-tight text-fg">{title}</h1>
          <p className="mt-1 text-sm text-fg-muted">{description}</p>
        </div>
        {hasCodes && (
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              aria-label="Date range"
              size="touch"
              value={range}
              onChange={setRange}
              options={RANGE_OPTIONS}
              className="min-w-0 flex-1 sm:flex-none"
            />
            <a href={exportHref} download className={buttonClasses("outline", "md")}>
              <Download aria-hidden /> CSV
            </a>
          </div>
        )}
      </div>

      {hasCodes && range === "custom" && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor={fromId} className="text-sm font-medium text-fg">
              From
            </label>
            <TextInput
              id={fromId}
              type="date"
              value={fromDay}
              max={toDay}
              onChange={(event) => setFromDay(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor={toId} className="text-sm font-medium text-fg">
              To
            </label>
            <TextInput
              id={toId}
              type="date"
              value={toDay}
              min={fromDay}
              onChange={(event) => setToDay(event.target.value)}
            />
          </div>
          {!bounds && (
            <p role="alert" className="pb-2.5 text-sm text-danger">
              Pick a start on or before the end.
            </p>
          )}
        </div>
      )}

      {!hasCodes ? (
        <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <h2 className="font-display text-lg font-bold text-fg">No trackable codes yet</h2>
          <p className="max-w-md text-sm text-fg-muted">
            Analytics counts scans of trackable codes and hosted pages. Static codes encode their
            content directly, so their scans never reach Ziplume.
          </p>
          <Link href="/codes/new?type=url" className={buttonClasses("primary", "md")}>
            Create a trackable code
          </Link>
        </Card>
      ) : (
        <>
          {error && (
            <p
              role="alert"
              className="rounded-control bg-danger-soft px-4 py-3 text-sm text-danger"
            >
              {error}
            </p>
          )}
          <div
            className="flex flex-col gap-6 transition-opacity aria-busy:opacity-60"
            aria-busy={loading}
            aria-live="polite"
          >
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile
                label="Scans"
                value={data ? formatCount(data.total) : "–"}
                detail={rangeLabel}
              />
              <StatTile
                label="Unique visitors"
                value={data ? formatCount(data.unique) : "–"}
                detail={
                  data && data.total > 0
                    ? `${(data.total / Math.max(data.unique, 1)).toFixed(1)} scans per visitor`
                    : undefined
                }
              />
              <StatTile
                label="Busiest day"
                value={
                  busiest
                    ? new Date(`${busiest.day}T12:00:00Z`).toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                        timeZone: "UTC",
                      })
                    : "–"
                }
                detail={busiest ? `${formatCount(busiest.scans)} scans` : undefined}
              />
              <StatTile
                label="Top country"
                value={
                  topCountry ? (
                    <span>
                      {countryFlag(topCountry.label)} {topCountry.label}
                    </span>
                  ) : (
                    "–"
                  )
                }
                detail={topCountry ? countryName(topCountry.label) : undefined}
              />
            </div>

            {data && data.total === 0 ? (
              <Card className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                <h2 className="font-display text-lg font-bold text-fg">
                  No scans in this range yet
                </h2>
                <p className="max-w-md text-sm text-fg-muted">Try a longer date range.</p>
              </Card>
            ) : (
              <>
                <Card>
                  <CardHeader
                    title={weekly ? "Scans per week" : "Scans per day"}
                    description={
                      timeZone ? `Times shown in ${timeZone.replace(/_/g, " ")}.` : undefined
                    }
                  />
                  <div className="px-5 pt-4 pb-6 sm:px-6">
                    {data ? (
                      <DailyChart points={points} weekly={weekly} />
                    ) : (
                      <div className="h-56" />
                    )}
                  </div>
                </Card>
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="lg:col-span-2">
                    <CardHeader
                      title="Top codes"
                      description="The 20 most scanned in this range."
                    />
                    <div className="px-5 pt-4 pb-6 sm:px-6">
                      <BreakdownList
                        total={data?.total ?? 0}
                        empty="No scans yet."
                        items={(data?.codes ?? []).map((c) => ({
                          key: c.id,
                          label: c.name,
                          scans: c.scans,
                          href: withWorkspace(
                            `/codes/${c.id}/analytics`,
                            c.owner && c.owner !== meId ? c.owner : null,
                          ),
                        }))}
                      />
                    </div>
                  </Card>
                  <Card>
                    <CardHeader title="Countries" />
                    <div className="px-5 pt-4 pb-6 sm:px-6">
                      <BreakdownList
                        total={data?.total ?? 0}
                        empty="No location data yet."
                        items={toItems(data?.countries ?? [], (c) => ({
                          key: c.label,
                          label: countryName(c.label),
                          icon: countryFlag(c.label),
                        }))}
                      />
                    </div>
                  </Card>
                  <Card>
                    <CardHeader title="Devices" />
                    <div className="px-5 pt-4 pb-6 sm:px-6">
                      <BreakdownList
                        total={data?.total ?? 0}
                        empty="No scans yet."
                        items={toItems(data?.devices ?? [], (d) => ({
                          key: d.label,
                          label: DEVICE_LABELS[d.label] ?? d.label,
                        }))}
                      />
                    </div>
                  </Card>
                </div>
              </>
            )}
          </div>
        </>
      )}

      <p className="text-sm text-fg-muted">
        Scans from link previewers and bots aren’t counted. Unique visitors are counted per day
        across these codes, without storing IP addresses.
      </p>
    </div>
  );
}
