import type { NextRequest } from "next/server";

import {
  RANGES,
  csvField,
  customBounds,
  dayInZone,
  rangeBounds,
  type RangeKey,
} from "@/lib/analytics/shape";
import { getAuthState } from "@/lib/auth/server";
import { accountsEnabled, shortLink } from "@/lib/env";
import { codesScope } from "@/lib/teams/access";
import { loadTeam } from "@/lib/teams/server";
import type { Database } from "@/types/supabase";

export const dynamic = "force-dynamic";

type ScanRow = Database["public"]["Functions"]["workspace_scans"]["Returns"][number];

const PAGE = 1000;
const MAX_ROWS = 1_000_000;
const COLUMNS = [
  "scanned_at_utc",
  "local_date",
  "local_time",
  "code",
  "short_link",
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

/**
 * Downloads a workspace's scans as CSV, scoped like the Analytics page. Row-level security keeps
 * them to the codes the person can see.
 */
export async function GET(request: NextRequest) {
  if (!accountsEnabled) return text("Not found", 404);
  const { supabase, user, needsMfa } = await getAuthState();
  if (!user || needsMfa) return text("Sign in to download analytics.", 401);

  const search = new URL(request.url).searchParams;
  const team = await loadTeam(supabase);
  const scope = codesScope(team, user.id, {
    workspace: search.get("workspace"),
    view: search.get("view"),
  });
  const owner =
    scope.kind === "everyone" ? null : scope.kind === "person" ? scope.person.userId : user.id;
  const timeZone = validTimeZone(search.get("tz"));
  const now = new Date();
  const rangeParam = search.get("range");

  let bounds: { from: Date; to: Date } | null;
  if (rangeParam === "custom") {
    bounds = customBounds(search.get("from") ?? "", search.get("to") ?? "", timeZone, now);
    if (!bounds) return text("Pick a start on or before the end.", 400);
  } else {
    const range: RangeKey = RANGES.some((r) => r.value === rangeParam)
      ? (rangeParam as RangeKey)
      : "all";
    let first = supabase
      .from("qr_codes")
      .select("created_at")
      .eq("is_dynamic", true)
      .order("created_at", { ascending: true })
      .limit(1);
    if (owner) first = first.eq("user_id", owner);
    const { data: firstCode } = await first.maybeSingle();
    bounds = rangeBounds(
      range,
      now,
      new Date(firstCode?.created_at ?? now.toISOString()),
      timeZone,
    );
  }
  const { from, to } = bounds;

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
      let before: number | null = null;
      let sent = 0;
      try {
        while (sent < MAX_ROWS) {
          // Typed here, since each page's last id feeds the next request.
          const result: { data: ScanRow[] | null; error: { message: string } | null } =
            await supabase.rpc("workspace_scans", {
              p_owner: owner,
              p_from: from.toISOString(),
              p_to: to.toISOString(),
              p_before: before,
              p_limit: PAGE,
            });
          if (result.error) throw new Error(result.error.message);
          const data = result.data;
          if (!data?.length) break;
          const lines = data.map((row) => {
            const at = new Date(row.scanned_at);
            return [
              at.toISOString(),
              localDate.format(at),
              localTime.format(at),
              row.code_name,
              row.code_slug ? shortLink(row.code_slug) : "",
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
          before = data.at(-1)!.id;
          if (data.length < PAGE) break;
        }
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  const filename = `ziplume-scans-${rangeParam === "custom" ? "custom" : (rangeParam ?? "all")}-${dayInZone(now, timeZone)}.csv`;
  return new Response(stream, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${filename}"`,
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
