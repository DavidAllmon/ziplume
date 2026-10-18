"use client";

import { Download } from "lucide-react";
import { useMemo } from "react";

import { buttonClasses } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { sanitizePage } from "@/lib/pages/sanitize";
import { csvHref, usesCsv } from "@/lib/responses/csv";
import type { CouponUseRow } from "@/types/supabase";

import { formatCount, relativeTime } from "./format";
import { useCodeRows } from "./useCodeRows";

/** How many times a coupon was marked used, once per phone (spec item 29). */
export function CouponUses({ codeId, content }: { codeId: string; content: unknown }) {
  const on = useMemo(() => sanitizePage("coupon", content).markUsed, [content]);
  const { rows, total, failed } = useCodeRows<CouponUseRow>(
    "coupon_redemptions",
    codeId,
    "id, code_id, created_at",
  );
  if (!on && !rows?.length) return null;
  return (
    <Card>
      <CardHeader
        title="Uses"
        description="Each phone can mark the coupon used once."
        action={
          rows?.length ? (
            <a
              href={csvHref(usesCsv(rows))}
              download="coupon-uses.csv"
              className={buttonClasses("outline", "sm")}
            >
              <Download aria-hidden /> CSV
            </a>
          ) : undefined
        }
      />
      <div className="flex flex-col gap-1 px-5 pt-4 pb-6 sm:px-6">
        {failed ? (
          <p className="text-sm text-danger">Uses couldn’t be loaded.</p>
        ) : rows === null ? (
          <p className="text-sm text-fg-muted">Loading…</p>
        ) : (
          <>
            <p className="text-2xl font-semibold text-fg tabular-nums">{formatCount(total)} used</p>
            <p className="text-sm text-fg-muted">
              {rows[0]
                ? `Last used ${relativeTime(rows[0].created_at).toLowerCase()}`
                : "Not used yet. Each use appears here as soon as it’s marked."}
            </p>
          </>
        )}
      </div>
    </Card>
  );
}
