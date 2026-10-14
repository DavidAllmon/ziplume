"use client";

import { Lock } from "lucide-react";
import Link from "next/link";

import { withWorkspace } from "@/components/app/nav";
import { codeRenderOptions, codeTypeLabel } from "@/features/dashboard/codeRender";
import { formatCount } from "@/features/dashboard/format";
import { QrTile } from "@/features/generator/preview/QrTile";

import { CodeActions } from "./CodeActions";
import type { CodeItemProps } from "./CodeRow";
import { listStatus } from "./filters";
import { StatusPill } from "./StatusPill";

/** One code in the grid view: thumbnail, name, type, status and scans. No badge pile. */
export function CodeTile({
  code,
  canEdit,
  teamId,
  scans,
  selected,
  onSelect,
  ...on
}: CodeItemProps) {
  const href = withWorkspace(`/codes/${code.id}`, teamId);
  return (
    <li
      aria-label={code.name}
      className={`flex min-w-0 flex-col gap-3 rounded-card border bg-surface p-4 ${selected ? "border-primary" : "border-border"}`}
    >
      <div className="flex items-center justify-between">
        <input
          type="checkbox"
          aria-label={`Select ${code.name}`}
          checked={selected}
          onChange={(e) => onSelect(code, e.target.checked)}
          className="size-5 cursor-pointer accent-primary"
        />
        <CodeActions code={code} canEdit={canEdit} teamId={teamId} {...on} />
      </div>
      <Link href={href} tabIndex={-1} aria-hidden className="mx-auto rounded-lg">
        <QrTile
          compact
          options={codeRenderOptions(code, 320)}
          summary={code.name}
          emptyHint=""
          resolution={224}
          className="size-28"
        />
      </Link>
      <div className="min-w-0">
        <p className="flex min-w-0 items-center gap-1.5">
          <Link
            href={href}
            className="truncate font-medium text-fg underline-offset-4 focus-ring hover:underline"
          >
            {code.name}
          </Link>
          {code.has_password && (
            <Lock aria-label="Password protected" className="size-3.5 shrink-0 text-fg-muted" />
          )}
        </p>
        <p className="truncate text-sm text-fg-muted">{codeTypeLabel(code)}</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <StatusPill status={listStatus(code)} />
        {code.is_dynamic && (
          <span className="text-sm text-fg-muted tabular-nums">
            {formatCount(scans)} {scans === 1 ? "scan" : "scans"}
            <span className="sr-only"> in the last 30 days</span>
          </span>
        )}
      </div>
    </li>
  );
}
