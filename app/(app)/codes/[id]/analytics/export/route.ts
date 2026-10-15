import type { NextRequest } from "next/server";

import { RANGES, csvField, dayInZone, rangeBounds, type RangeKey } from "@/lib/analytics/shape";
import { getAuthState } from "@/lib/auth/server";
import { accountsEnabled } from "@/lib/env";

export const dynamic = "force-dynamic";

const PAGE = 1000;
const MAX_ROWS = 1_000_000;
const COLUMNS = [
  "scanned_at_utc",
  "local_date",
  "local_time",
  "country",
  "region",
  "city",
  "device",
  "os",
  "browser",
];

function validTimeZone(tz: string | null): string {
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}

const text = (body: string, status: number) =>
  new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });

/** Downloads a code's scan events as CSV. Row-level security limits it to the owner's codes. */
export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/codes/[id]/analytics/export">,
) {
  if (!accountsEnabled) return text("Not found", 404);
  const { id } = await params;
  const { supabase, user, needsMfa } = await getAuthState();
  if (!user || needsMfa) return text("Sign in to download analytics.", 401);

  const { data: code } = await supabase
    .from("qr_codes")
    .select("id, slug, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!code) return text("Not found", 404);

  const search = request.nextUrl.searchParams;
  const rangeParam = search.get("range");
  const range: RangeKey = RANGES.some((r) => r.value === rangeParam)
    ? (rangeParam as RangeKey)
    : "all";
  const timeZone = validTimeZone(search.get("tz"));
  const now = new Date();
  const { from, to } = rangeBounds(range, now, new Date(code.created_at), timeZone);

  const localDate = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const localTime = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(`${COLUMNS.join(",")}\r\n`));
      let lastId: number | null = null;
      let sent = 0;
      try {
        while (sent < MAX_ROWS) {
          let query = supabase
            .from("scan_events")
            .select("id, scanned_at, country, region, city, device_type, os, browser")
            .eq("code_id", code.id)
            .gte("scanned_at", from.toISOString())
            .lt("scanned_at", to.toISOString())
            .order("id", { ascending: false })
            .limit(PAGE);
          if (lastId !== null) query = query.lt("id", lastId);
          const { data, error } = await query;
          if (error) throw new Error(error.message);
          if (!data.length) break;
          const lines = data.map((row) => {
            const at = new Date(row.scanned_at);
            return [
              at.toISOString(),
              localDate.format(at),
              localTime.format(at),
              row.country,
              row.region,
              row.city,
              row.device_type,
              row.os,
              row.browser,
            ]
              .map(csvField)
              .join(",");
          });
          controller.enqueue(encoder.encode(`${lines.join("\r\n")}\r\n`));
          sent += data.length;
          lastId = data.at(-1)!.id;
          if (data.length < PAGE) break;
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  const slug = (code.slug ?? "code").toLowerCase();
  const filename = `ziplume-scans-${slug}-${range}-${dayInZone(now, timeZone)}.csv`;
  return new Response(stream, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
