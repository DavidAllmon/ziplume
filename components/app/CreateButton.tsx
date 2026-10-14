"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ChevronDown, Plus, Rows3 } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

import { bulkCreateHref, menuItemClass, menuPanelClass, newCodeHref } from "./nav";

/** "+ Create code", with bulk creation one click away. */
export function CreateButton({
  ownerId,
  folderId = null,
  collapsed = false,
  onNavigate,
}: {
  ownerId: string | null;
  /** The folder being viewed; new codes go into it. */
  folderId?: string | null;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className={cn("flex", collapsed && "max-lg:justify-center")}>
      <Link
        href={newCodeHref({ folderId, ownerId })}
        onClick={onNavigate}
        className={cn(
          buttonClasses("primary", "md"),
          "flex-1 rounded-r-none",
          collapsed && "max-lg:w-11 max-lg:flex-none max-lg:rounded-control max-lg:px-0",
        )}
      >
        <Plus aria-hidden />
        <span className={cn(collapsed && "max-lg:sr-only")}>Create code</span>
      </Link>
      <Menu as="div" className={cn("relative", collapsed && "max-lg:hidden")}>
        <MenuButton
          aria-label="More ways to create"
          className={cn(
            buttonClasses("primary", "md"),
            "rounded-l-none border-l border-primary-fg/25 px-2.5",
          )}
        >
          <ChevronDown aria-hidden />
        </MenuButton>
        <MenuItems anchor={{ to: "bottom end", gap: 6 }} transition className={menuPanelClass}>
          <MenuItem>
            <Link
              href={bulkCreateHref({ folderId, ownerId })}
              onClick={onNavigate}
              className={menuItemClass}
            >
              <Rows3 aria-hidden /> Bulk create from a spreadsheet
            </Link>
          </MenuItem>
        </MenuItems>
      </Menu>
    </div>
  );
}
