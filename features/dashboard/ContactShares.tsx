"use client";

import { Download, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { IconButton, buttonClasses } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { sanitizePage } from "@/lib/pages/sanitize";
import { mailHref, telHref } from "@/lib/pages/urls";
import { csvHref, sharesCsv } from "@/lib/responses/csv";
import type { ContactShareRow } from "@/types/supabase";

import { formatCount, relativeTime } from "./format";
import { useCodeRows } from "./useCodeRows";

const COLUMNS = "id, code_id, created_at, name, phone, email, note";
const link = "text-accent underline-offset-4 hover:underline [overflow-wrap:anywhere]";

/** Details visitors shared from a Contact page (spec item 15), newest first, with a CSV. */
export function ContactShares({
  codeId,
  content,
  canEdit,
}: {
  codeId: string;
  content: unknown;
  canEdit: boolean;
}) {
  const on = useMemo(() => sanitizePage("vcard", content).shareDetails, [content]);
  const { rows, total, failed, remove } = useCodeRows<ContactShareRow>(
    "contact_shares",
    codeId,
    COLUMNS,
  );
  // Shown once the page asks, and kept while anything shared is left.
  if (!on && !rows?.length) return null;
  return (
    <Card>
      <CardHeader
        title="Shared details"
        description={
          total
            ? `${formatCount(total)} ${total === 1 ? "person" : "people"}`
            : "Details visitors send you from your page."
        }
        action={
          rows?.length ? (
            <a
              href={csvHref(sharesCsv(rows))}
              download="shared-details.csv"
              className={buttonClasses("outline", "sm")}
            >
              <Download aria-hidden /> CSV
            </a>
          ) : undefined
        }
      />
      <div className="flex flex-col gap-3 px-5 pt-4 pb-6 sm:px-6">
        {failed ? (
          <p className="text-sm text-danger">Shared details couldn’t be loaded.</p>
        ) : rows === null ? (
          <p className="text-sm text-fg-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="rounded-control bg-surface-2 px-3.5 py-3 text-sm text-fg-muted">
            Nobody has shared their details yet. They appear here as soon as someone does.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const tel = r.phone ? telHref(r.phone) : null;
              const mail = r.email ? mailHref(r.email) : null;
              return (
                <li key={r.id} className="flex gap-3 py-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-sm">
                    <span className="font-semibold [overflow-wrap:anywhere] text-fg">{r.name}</span>
                    {r.phone &&
                      (tel ? (
                        <a href={tel} className={link}>
                          {r.phone}
                        </a>
                      ) : (
                        <span>{r.phone}</span>
                      ))}
                    {r.email &&
                      (mail ? (
                        <a href={mail} className={link}>
                          {r.email}
                        </a>
                      ) : (
                        <span>{r.email}</span>
                      ))}
                    {r.note && <p className="whitespace-pre-line text-fg">{r.note}</p>}
                    <span className="text-xs text-fg-muted">{relativeTime(r.created_at)}</span>
                  </div>
                  {canEdit && (
                    <IconButton
                      label={`Delete ${r.name}’s details`}
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
        {rows && total > rows.length && (
          <p className="text-xs text-fg-muted">Showing the latest {formatCount(rows.length)}.</p>
        )}
      </div>
    </Card>
  );
}
