"use client";

import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { buttonClasses } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { CopyButton } from "@/features/dashboard/CopyButton";
import { formatCount, relativeTime } from "@/features/dashboard/format";
import {
  RANGES,
  countryFlag,
  countryName,
  fillDays,
  groupByWeek,
  parseAnalytics,
  rangeBounds,
  type AnalyticsData,
  type RangeKey,
} from "@/lib/analytics/shape";
import { shortLink, shortLinkLabel } from "@/lib/env";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { QrCodeRow } from "@/types/supabase";

import { BreakdownList } from "./BreakdownList";
import { DailyChart } from "./DailyChart";
import { HoursChart } from "./HoursChart";
import { DEVICE_LABELS, StatTile, toItems, useViewerTimeZone } from "./parts";

const RANGE_OPTIONS = RANGES.map((r) => ({
  value: r.value,
  label: r.value === "all" ? "All" : r.value.toUpperCase(),
  ariaLabel: r.label,
}));

type Result = { key: string; data: AnalyticsData } | { key: string; error: string };

export function AnalyticsView({ code }: { code: QrCodeRow }) {
  const [range, setRange] = useState<RangeKey>("30d");
  const timeZone = useViewerTimeZone();
  const [result, setResult] = useState<Result | null>(null);
  const [now] = useState(() => new Date());

  const bounds = useMemo(
    () => rangeBounds(range, now, new Date(code.created_at), timeZone ?? "UTC"),
    [range, now, code.created_at, timeZone],
  );
  const requestKey = `${range}|${timeZone}`;

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase || !timeZone) return;
    let cancelled = false;
    void supabase
      .rpc("code_analytics", {
        p_code: code.id,
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
            : { key: requestKey, data: parseAnalytics(data) },
        );
      });
    return () => {
      cancelled = true;
    };
  }, [code.id, bounds, timeZone, requestKey]);

  const loading = result?.key !== requestKey;
  const data = result && "data" in result ? result.data : null;
  const error = !loading && result && "error" in result ? result.error : null;

  // Ranges longer than about four months read better as weekly bars.
  const weekly = bounds.to.getTime() - bounds.from.getTime() > 120 * 86_400_000;
  const points = useMemo(() => {
    if (!data) return [];
    const days = fillDays(data.daily, bounds.from, bounds.to, timeZone ?? "UTC");
    return weekly ? groupByWeek(days) : days;
  }, [data, bounds, timeZone, weekly]);

  const busiest = data?.daily.reduce<{ day: string; scans: number } | null>(
    (best, d) => (d.scans > (best?.scans ?? 0) ? d : best),
    null,
  );
  const topCountry = data?.countries.find((c) => c.label !== "??");
  const exportHref = `/codes/${code.id}/analytics/export?range=${range}&tz=${encodeURIComponent(timeZone ?? "UTC")}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href={`/codes/${code.id}`}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-link underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" /> {code.name}
        </Link>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-bold tracking-tight text-fg">Analytics</h1>
            {code.slug && (
              <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-fg-muted">
                <span className="font-mono text-fg">{shortLinkLabel(code.slug)}</span>
                <CopyButton text={shortLink(code.slug)} />
                <span aria-hidden>·</span>
                <span suppressHydrationWarning>
                  Last scan {relativeTime(code.last_scanned_at).toLowerCase()}
                </span>
                {code.status === "paused" && (
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-semibold text-fg">
                    Paused
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SegmentedControl
              aria-label="Date range"
              value={range}
              onChange={setRange}
              options={RANGE_OPTIONS}
              className="min-w-72 flex-1 sm:flex-none"
            />
            <a href={exportHref} download className={buttonClasses("outline", "md")}>
              <Download aria-hidden /> CSV
            </a>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-control bg-danger-soft px-4 py-3 text-sm text-danger">
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
            detail={`Last ${RANGES.find((r) => r.value === range)?.label.toLowerCase()}`}
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
            detail={
              busiest
                ? `${formatCount(busiest.scans)} scans · ${new Date(`${busiest.day}T12:00:00Z`).toLocaleDateString("en", { weekday: "long", timeZone: "UTC" })}`
                : undefined
            }
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
          <Card className="flex flex-col items-center gap-3 px-6 py-12 text-center">
            <h2 className="font-display text-lg font-bold text-fg">No scans in this range yet</h2>
            <p className="max-w-md text-sm text-fg-muted">
              {code.scan_count > 0
                ? "Try a longer date range to see earlier scans."
                : "Scans appear here a moment after someone scans your code. Test it with your phone camera, or open the short link."}
            </p>
            {code.slug && (
              <a
                href={shortLink(code.slug)}
                target="_blank"
                rel="noopener"
                className={buttonClasses("outline", "md")}
              >
                Open short link <ExternalLink aria-hidden />
              </a>
            )}
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
                {data ? <DailyChart points={points} weekly={weekly} /> : <div className="h-56" />}
              </div>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
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
                <CardHeader title="Cities" />
                <div className="px-5 pt-4 pb-6 sm:px-6">
                  <BreakdownList
                    total={data?.total ?? 0}
                    empty="No city data yet. Cities appear when the site runs behind Cloudflare with visitor location headers on."
                    items={toItems(data?.cities ?? [], (c) => ({
                      key: `${c.label}|${c.country ?? ""}`,
                      label: c.country ? `${c.label}, ${countryName(c.country)}` : c.label,
                      icon: countryFlag(c.country),
                    }))}
                  />
                </div>
              </Card>
              <Card>
                <CardHeader
                  title="Time of day"
                  description="When people scan, in your time zone."
                />
                <div className="px-5 pt-6 pb-6 sm:px-6">
                  <HoursChart hours={data?.hours ?? []} />
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
              <Card>
                <CardHeader title="Operating systems" />
                <div className="px-5 pt-4 pb-6 sm:px-6">
                  <BreakdownList
                    total={data?.total ?? 0}
                    empty="No scans yet."
                    items={toItems(data?.os ?? [], (o) => ({ key: o.label, label: o.label }))}
                  />
                </div>
              </Card>
              <Card>
                <CardHeader title="Browsers" />
                <div className="px-5 pt-4 pb-6 sm:px-6">
                  <BreakdownList
                    total={data?.total ?? 0}
                    empty="No scans yet."
                    items={toItems(data?.browsers ?? [], (b) => ({ key: b.label, label: b.label }))}
                  />
                </div>
              </Card>
            </div>
          </>
        )}
      </div>

      <p className="text-sm text-fg-muted">
        Scans from link previewers and bots aren’t counted. Unique visitors are counted per day
        without storing IP addresses.
      </p>
    </div>
  );
}
