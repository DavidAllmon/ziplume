"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import {
  BarChart3,
  Copy,
  Download,
  ExternalLink,
  FolderInput,
  MoreHorizontal,
  Pause,
  Pencil,
  Play,
  Trash2,
} from "lucide-react";
import Link from "next/link";

import { menuItemClass, menuPanelClass, withWorkspace } from "@/components/app/nav";
import type { QrCodeRow } from "@/types/supabase";

export interface CodeActionHandlers {
  onDuplicate: (code: QrCodeRow) => void;
  onMove: (codes: QrCodeRow[]) => void;
  onToggleStatus: (code: QrCodeRow) => void;
  onDelete: (codes: QrCodeRow[]) => void;
  onDownload: (code: QrCodeRow) => void;
}

/** The ⋯ menu on each code: Open, Analytics, Download, and for editors the changes. */
export function CodeActions({
  code,
  canEdit,
  teamId,
  ...on
}: { code: QrCodeRow; canEdit: boolean; teamId: string | null } & CodeActionHandlers) {
  const paused = code.status === "paused";
  return (
    <Menu as="div" className="relative">
      <MenuButton
        aria-label={`Actions for ${code.name}`}
        className="grid size-11 place-items-center rounded-control text-fg-muted hover:bg-surface-2 hover:text-fg data-focus:outline-2 data-focus:outline-ring sm:size-9"
      >
        <MoreHorizontal aria-hidden className="size-5" />
      </MenuButton>
      <MenuItems anchor={{ to: "bottom end", gap: 4 }} transition className={menuPanelClass}>
        <MenuItem>
          <Link href={withWorkspace(`/codes/${code.id}`, teamId)} className={menuItemClass}>
            <ExternalLink aria-hidden /> Open
          </Link>
        </MenuItem>
        {canEdit && (
          <MenuItem>
            <Link href={withWorkspace(`/codes/${code.id}/edit`, teamId)} className={menuItemClass}>
              <Pencil aria-hidden /> Edit
            </Link>
          </MenuItem>
        )}
        {code.is_dynamic && (
          <MenuItem>
            <Link
              href={withWorkspace(`/codes/${code.id}/analytics`, teamId)}
              className={menuItemClass}
            >
              <BarChart3 aria-hidden /> Analytics
            </Link>
          </MenuItem>
        )}
        <MenuItem
          as="button"
          type="button"
          onClick={() => on.onDownload(code)}
          className={menuItemClass}
        >
          <Download aria-hidden /> Download PNG
        </MenuItem>
        {canEdit && (
          <>
            <MenuItem
              as="button"
              type="button"
              onClick={() => on.onDuplicate(code)}
              className={menuItemClass}
            >
              <Copy aria-hidden /> Duplicate
            </MenuItem>
            <MenuItem
              as="button"
              type="button"
              onClick={() => on.onMove([code])}
              className={menuItemClass}
            >
              <FolderInput aria-hidden /> Move to folder
            </MenuItem>
            {code.is_dynamic && (
              <MenuItem
                as="button"
                type="button"
                onClick={() => on.onToggleStatus(code)}
                className={menuItemClass}
              >
                {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
                {paused ? "Resume" : "Pause"}
              </MenuItem>
            )}
            <MenuItem
              as="button"
              type="button"
              onClick={() => on.onDelete([code])}
              className={`${menuItemClass} text-danger`}
            >
              <Trash2 aria-hidden /> Delete
            </MenuItem>
          </>
        )}
      </MenuItems>
    </Menu>
  );
}
