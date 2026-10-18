"use client";

import { Download, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { IconButton, buttonClasses } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { rsvpCapacity } from "@/lib/pages/responses";
import { sanitizePage } from "@/lib/pages/sanitize";
import { mailHref } from "@/lib/pages/urls";
import { csvHref, rsvpsCsv } from "@/lib/responses/csv";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { RsvpRow } from "@/types/supabase";

import { formatCount, relativeTime } from "./format";
import { useCodeRows } from "./useCodeRows";

const COLUMNS = "id, code_id, created_at, name, email, guests, note";

/** Who's coming to an event (spec item 33): the places taken, and each RSVP, with a CSV. */
export function EventRsvps({
  codeId,
  content,
  canEdit,
}: {
  codeId: string;
  content: unknown;
  canEdit: boolean;
}) {
  const page = useMemo(() => sanitizePage("event", content), [content]);
  const capacity = rsvpCapacity(page.rsvpCapacity);
  const { rows, total, failed, remove } = useCodeRows<RsvpRow>("event_rsvps", codeId, COLUMNS);
  // Every guest, counted by the database: the list holds only the latest 1,000.
  const [guests, setGuests] = useState<number | null>(null);
  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let active = true;
    supabase.rpc("rsvp_guests", { p_code: codeId }).then(({ data }) => {
      if (active && typeof data === "number") setGuests(data);
    });
    return () => {
      active = false;
    };
  }, [codeId, total]);

  if (!page.rsvp && !rows?.length) return null;
  const taken = guests ?? 0;
  return (
    <Card>
      <CardHeader
        title="RSVPs"
        description={
          total
            ? `${formatCount(total)} ${total === 1 ? "RSVP" : "RSVPs"}`
            : "Who’s coming, from your page."
        }
        action={
          rows?.length ? (
            <a
              href={csvHref(rsvpsCsv(rows))}
              download="rsvps.csv"
              className={buttonClasses("outline", "sm")}
            >
              <Download aria-hidden /> CSV
            </a>
          ) : undefined
        }
      />
      <div className="flex flex-col gap-3 px-5 pt-4 pb-6 sm:px-6">
        {failed ? (
          <p className="text-sm text-danger">RSVPs couldn’t be loaded.</p>
        ) : rows === null ? (
          <p className="text-sm text-fg-muted">Loading…</p>
        ) : (
          <>
            <p className="text-lg font-semibold text-fg tabular-nums">
              {capacity
                ? `${formatCount(taken)} of ${formatCount(capacity)} places taken`
                : `${formatCount(taken)} ${taken === 1 ? "guest" : "guests"}`}
            </p>
            {rows.length === 0 ? (
              <p className="rounded-control bg-surface-2 px-3.5 py-3 text-sm text-fg-muted">
                No RSVPs yet. They appear here as soon as someone sends one.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {rows.map((r) => {
                  const mail = mailHref(r.email);
                  return (
                    <li key={r.id} className="flex gap-3 py-3">
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
                        <span className="font-semibold [overflow-wrap:anywhere] text-fg">
                          {r.name}
                        </span>
                        {mail ? (
                          <a
                            href={mail}
                            className="text-accent [overflow-wrap:anywhere] underline-offset-4 hover:underline"
                          >
                            {r.email}
                          </a>
                        ) : (
                          <span>{r.email}</span>
                        )}
                        <span className="text-fg">
                          {r.guests === 1 ? "1 guest" : `${r.guests} guests`}
                        </span>
                        {r.note && <p className="whitespace-pre-line text-fg">{r.note}</p>}
                        <span className="text-xs text-fg-muted">{relativeTime(r.created_at)}</span>
                      </div>
                      {canEdit && (
                        <IconButton
                          label={`Delete ${r.name}’s RSVP`}
                          size="icon-sm"
                          onClick={() => void remove(r.id)}
                        >
                          <Trash2 aria-hidden />
                        </IconButton>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            {total > rows.length && (
              <p className="text-xs text-fg-muted">
                Showing the latest {formatCount(rows.length)}.
              </p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
