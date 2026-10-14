"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
  BarChart3,
  Copy,
  Eye,
  Folder,
  FolderInput,
  Lock,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import { QrTile } from "@/features/generator/preview/QrTile";
import { shortLink, shortLinkLabel } from "@/lib/env";
import type { QrCodeRow } from "@/types/supabase";

import {
  codeRenderOptions,
  codeState,
  codeSummary,
  codeTypeLabel,
  isHostedPage,
} from "./codeRender";
import { CopyButton } from "./CopyButton";
import { formatCount, relativeTime } from "./format";

interface CodeCardProps {
  code: QrCodeRow;
  /** False for viewers of a team workspace: they can look but not change anything. */
  canEdit: boolean;
  folderName: string | null;
  selected: boolean;
  onSelect: (code: QrCodeRow, selected: boolean) => void;
  onDuplicate: (code: QrCodeRow) => void;
  onToggleStatus: (code: QrCodeRow) => void;
  onMove: (code: QrCodeRow) => void;
  onDelete: (code: QrCodeRow) => void;
}

const itemClass =
  "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg data-focus:bg-surface-2";

export function CodeCard({
  code,
  canEdit,
  folderName,
  selected,
  onSelect,
  onDuplicate,
  onToggleStatus,
  onMove,
  onDelete,
}: CodeCardProps) {
  const paused = code.status === "paused";
  const state = codeState(code);
  return (
    <li
      className={`flex min-w-0 flex-col gap-4 rounded-card border bg-surface p-4 shadow-card ${selected ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
    >
      <div className="flex items-start gap-4">
        <Link
          href={`/codes/${code.id}`}
          className="shrink-0 rounded-lg focus-ring"
          aria-label={`Open ${code.name}`}
        >
          <QrTile
            compact
            options={codeRenderOptions(code, 256)}
            summary={code.name}
            emptyHint=""
            resolution={176}
            className="size-20"
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/codes/${code.id}`}
              className="truncate font-display text-base font-bold text-fg underline-offset-4 hover:underline"
            >
              {code.name}
            </Link>
            <div className="-mt-1 -mr-1 flex shrink-0 items-center">
              <input
                type="checkbox"
                aria-label={`Select ${code.name}`}
                checked={selected}
                onChange={(e) => onSelect(code, e.target.checked)}
                className="m-1.5 size-[1.125rem] cursor-pointer accent-primary"
              />
              <Menu as="div" className="relative">
                <MenuButton
                  aria-label={`Actions for ${code.name}`}
                  className="grid size-8 place-items-center rounded-lg text-fg-muted hover:bg-surface-2 data-focus:outline-2 data-focus:outline-ring"
                >
                  <MoreHorizontal aria-hidden className="size-5" />
                </MenuButton>
                <MenuItems
                  anchor={{ to: "bottom end", gap: 4 }}
                  transition
                  className="z-50 w-48 rounded-control border border-border bg-surface p-1.5 shadow-pop transition duration-150 data-closed:opacity-0"
                >
                  <MenuItem>
                    <Link href={`/codes/${code.id}`} className={itemClass}>
                      {canEdit ? (
                        <>
                          <Pencil aria-hidden className="size-4" /> Edit
                        </>
                      ) : (
                        <>
                          <Eye aria-hidden className="size-4" /> Open
                        </>
                      )}
                    </Link>
                  </MenuItem>
                  {code.is_dynamic && (
                    <MenuItem>
                      <Link href={`/codes/${code.id}/analytics`} className={itemClass}>
                        <BarChart3 aria-hidden className="size-4" /> Analytics
                      </Link>
                    </MenuItem>
                  )}
                  {canEdit && (
                    <MenuItem>
                      <button type="button" className={itemClass} onClick={() => onDuplicate(code)}>
                        <Copy aria-hidden className="size-4" /> Duplicate
                      </button>
                    </MenuItem>
                  )}
                  {canEdit && (
                    <MenuItem>
                      <button type="button" className={itemClass} onClick={() => onMove(code)}>
                        <FolderInput aria-hidden className="size-4" /> Move to folder
                      </button>
                    </MenuItem>
                  )}
                  {canEdit && code.is_dynamic && (
                    <MenuItem>
                      <button
                        type="button"
                        className={itemClass}
                        onClick={() => onToggleStatus(code)}
                      >
                        {paused ? (
                          <Play aria-hidden className="size-4" />
                        ) : (
                          <Pause aria-hidden className="size-4" />
                        )}
                        {paused ? "Resume" : "Pause"}
                      </button>
                    </MenuItem>
                  )}
                  {canEdit && (
                    <MenuItem>
                      <button
                        type="button"
                        className={`${itemClass} text-danger`}
                        onClick={() => onDelete(code)}
                      >
                        <Trash2 aria-hidden className="size-4" /> Delete
                      </button>
                    </MenuItem>
                  )}
                </MenuItems>
              </Menu>
            </div>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs font-semibold">
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-fg-muted">
              {codeTypeLabel(code)}
            </span>
            {isHostedPage(code) ? (
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-primary-soft-fg">
                Hosted page
              </span>
            ) : code.is_dynamic ? (
              <span className="rounded-full bg-primary-soft px-2 py-0.5 text-primary-soft-fg">
                Dynamic
              </span>
            ) : (
              <span className="rounded-full bg-surface-2 px-2 py-0.5 text-fg-muted">Static</span>
            )}
            {paused && (
              <span className="rounded-full bg-warning-soft px-2 py-0.5 text-warning">Paused</span>
            )}
            {state === "scheduled" && (
              <span className="rounded-full bg-warning-soft px-2 py-0.5 text-warning">
                Scheduled
              </span>
            )}
            {state === "expired" && (
              <span className="rounded-full bg-danger-soft px-2 py-0.5 text-danger">Expired</span>
            )}
            {code.has_password && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-fg-muted">
                <Lock aria-hidden className="size-3" /> Password
              </span>
            )}
            {folderName && (
              <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-fg-muted">
                <Folder aria-hidden className="size-3 shrink-0" />
                <span className="truncate">{folderName}</span>
              </span>
            )}
          </div>
          <p className="mt-1.5 truncate text-sm text-fg-muted">{codeSummary(code)}</p>
        </div>
      </div>
      {code.is_dynamic && code.slug ? (
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-sm">
          <div className="flex min-w-0 items-center gap-1">
            <span className="truncate font-mono text-xs text-fg">{shortLinkLabel(code.slug)}</span>
            <CopyButton text={shortLink(code.slug)} />
          </div>
          <Link
            href={`/codes/${code.id}/analytics`}
            className="flex shrink-0 items-center gap-1.5 font-semibold text-link underline-offset-4 hover:underline"
          >
            <BarChart3 aria-hidden className="size-4" />
            {formatCount(code.scan_count)} {code.scan_count === 1 ? "scan" : "scans"}
          </Link>
        </div>
      ) : (
        <p className="border-t border-border pt-3 text-sm text-fg-muted">
          Updated {relativeTime(code.updated_at)}
        </p>
      )}
    </li>
  );
}
