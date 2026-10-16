"use client";

import { EyeOff, Lock } from "lucide-react";
import Link from "next/link";

import { withWorkspace } from "@/components/app/nav";
import { Avatar } from "@/components/ui/Avatar";
import { codeRenderOptions, codeSummary, codeTypeLabel } from "@/features/dashboard/codeRender";
import { formatCount, relativeTime } from "@/features/dashboard/format";
import { QrTile } from "@/features/generator/preview/QrTile";
import { shortLinkLabel } from "@/lib/env";
import { firstName, type TeamPerson } from "@/lib/teams/access";
import type { QrCodeRow } from "@/types/supabase";

import { CodeActions, type CodeActionHandlers } from "./CodeActions";
import { listStatus } from "./filters";
import { StatusPill } from "./StatusPill";

/** Column template shared by the table header and every row (768px and up). */
export const LIST_COLUMNS =
  "md:grid-cols-[auto_auto_minmax(0,2.5fr)_minmax(0,1fr)_7rem_6rem_7rem_auto]";

export interface CodeItemProps extends CodeActionHandlers {
  code: QrCodeRow;
  canEdit: boolean;
  teamId: string | null;
  scans: number;
  selected: boolean;
  onSelect: (code: QrCodeRow, selected: boolean) => void;
  /** Who made it, in the Everyone view; null elsewhere. */
  creator: TeamPerson | null;
  /** Your own code marked Private, shown while you're in a team. */
  isPrivate: boolean;
}

/** The short link for trackable codes, what it encodes for static ones. */
export const codeDetail = (code: QrCodeRow) =>
  code.is_dynamic && code.slug ? shortLinkLabel(code.slug) : codeSummary(code);

/** A code only its maker can see (teams spec 6). The lock already means a password here. */
export function PrivateBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-fg-muted">
      <EyeOff aria-hidden className="size-3" />
      Private
    </span>
  );
}

/** Who made a code, in the Everyone view (teams spec 5). */
export function CreatedBy({ person }: { person: TeamPerson }) {
  return (
    <p className="mt-1 flex min-w-0 items-center gap-1.5 text-sm text-fg-muted">
      <Avatar
        id={person.userId}
        name={person.name}
        email={person.email}
        src={person.avatarUrl}
        size="xs"
      />
      <span className="truncate">Created by {person.isMe ? "you" : firstName(person)}</span>
    </p>
  );
}

/** One code in the list view: a table row on wider screens, a stacked row on phones. */
export function CodeRow({
  code,
  canEdit,
  teamId,
  scans,
  selected,
  onSelect,
  creator,
  isPrivate,
  ...on
}: CodeItemProps) {
  const href = withWorkspace(`/codes/${code.id}`, teamId);
  const status = listStatus(code);
  const scanText = code.is_dynamic ? formatCount(scans) : "—";
  return (
    <li
      aria-label={code.name}
      className={`grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-b border-border px-3 py-3 last:border-b-0 ${LIST_COLUMNS} ${selected ? "bg-primary-soft/40" : ""}`}
    >
      {/* A 44px tap area on phones that takes no extra room in the row. */}
      <label className="-m-3 grid size-11 shrink-0 cursor-pointer place-items-center sm:m-0 sm:size-auto">
        <input
          type="checkbox"
          aria-label={`Select ${code.name}`}
          checked={selected}
          onChange={(e) => onSelect(code, e.target.checked)}
          className="size-5 cursor-pointer accent-primary"
        />
      </label>
      <Link href={href} tabIndex={-1} aria-hidden className="shrink-0 rounded-lg">
        <QrTile
          compact
          options={codeRenderOptions(code, 160)}
          summary={code.name}
          emptyHint=""
          resolution={96}
          className="size-10"
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
          {isPrivate && <PrivateBadge />}
        </p>
        <p className="truncate text-sm text-fg-muted">{codeDetail(code)}</p>
        {creator && <CreatedBy person={creator} />}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted md:hidden">
          {codeTypeLabel(code)} <StatusPill status={status} />
          {code.is_dynamic && (
            <span className="tabular-nums">
              {scanText} <span className="sr-only">scans in the last 30 days</span>
            </span>
          )}
        </p>
      </div>
      <span className="hidden truncate text-sm text-fg-muted md:block">{codeTypeLabel(code)}</span>
      <span className="hidden md:block">
        <StatusPill status={status} />
      </span>
      <span className="hidden text-right text-sm text-fg tabular-nums md:block">
        {scanText}
        <span className="sr-only"> scans in the last 30 days</span>
      </span>
      <span className="hidden text-sm text-fg-muted md:block">{relativeTime(code.updated_at)}</span>
      <CodeActions code={code} canEdit={canEdit} teamId={teamId} {...on} />
    </li>
  );
}
