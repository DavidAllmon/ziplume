"use client";

import { Download, Star, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { IconButton, buttonClasses } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { csvField } from "@/lib/analytics/shape";
import { cn } from "@/lib/cn";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { FeedbackRow } from "@/types/supabase";

import { relativeTime } from "./format";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex" aria-label={`${rating} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn("size-4", n <= rating ? "fill-amber-400 text-amber-400" : "text-border")}
        />
      ))}
    </span>
  );
}

/** Ratings and comments left on a feedback page, newest first. */
export function FeedbackResponses({ codeId }: { codeId: string }) {
  const toast = useToast();
  const [rows, setRows] = useState<FeedbackRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let active = true;
    supabase
      .from("feedback_responses")
      .select("*")
      .eq("code_id", codeId)
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setFailed(true);
        else setRows(data);
      });
    return () => {
      active = false;
    };
  }, [codeId]);

  async function remove(id: number) {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const { error } = await supabase.from("feedback_responses").delete().eq("id", id);
    if (error) return toast("That response couldn't be deleted.", "error");
    setRows((list) => list?.filter((r) => r.id !== id) ?? null);
  }

  const average = rows?.length ? rows.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rows.length : 0;
  const csv = rows?.length
    ? `data:text/csv;charset=utf-8,${encodeURIComponent(
        [
          "received_at,rating,comment,contact",
          ...rows.map((r) =>
            [r.created_at, r.rating, r.comment, r.contact].map(csvField).join(","),
          ),
        ].join("\r\n"),
      )}`
    : null;

  return (
    <Card>
      <CardHeader
        title="Responses"
        description={
          rows?.length
            ? `${rows.length} ${rows.length === 1 ? "response" : "responses"} · average ${average.toFixed(1)} out of 5`
            : "Ratings and comments from your feedback page."
        }
        action={
          csv ? (
            <a href={csv} download="feedback.csv" className={buttonClasses("outline", "sm")}>
              <Download aria-hidden /> CSV
            </a>
          ) : undefined
        }
      />
      <div className="px-5 pt-4 pb-6 sm:px-6">
        {failed ? (
          <p className="text-sm text-danger">Responses couldn’t be loaded.</p>
        ) : rows === null ? (
          <p className="text-sm text-fg-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="rounded-control bg-surface-2 px-3.5 py-3 text-sm text-fg-muted">
            No responses yet. They appear here as soon as someone rates you.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="flex gap-3 py-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Stars rating={r.rating ?? 0} />
                    <span className="text-xs text-fg-muted">{relativeTime(r.created_at)}</span>
                  </div>
                  {r.comment && <p className="text-sm whitespace-pre-line text-fg">{r.comment}</p>}
                  {r.contact && <p className="text-sm text-fg-muted">Contact: {r.contact}</p>}
                </div>
                <IconButton
                  label="Delete response"
                  size="icon-sm"
                  onClick={() => void remove(r.id)}
                >
                  <Trash2 aria-hidden />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
