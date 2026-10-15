"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { ChevronDown, Plus, Rows3 } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

import { bulkCreateHref, menuItemClass, menuPanelClass, newCodeHref } from "./nav";

/** "+ Create code", with bulk creation one click away. Creating always happens in your own codes. */
export function CreateButton({
  folderId = null,
  collapsed = false,
  onNavigate,
}: {
  /** The folder being viewed; new codes go into it. */
  folderId?: string | null;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <div className={cn("flex", collapsed && "rail:justify-center")}>
      <Link
        href={newCodeHref({ folderId, ownerId: null })}
        onClick={onNavigate}
        className={cn(
          buttonClasses("primary", "md"),
          "flex-1 rounded-r-none",
          collapsed && "rail:w-11 rail:flex-none rail:rounded-control rail:px-0",
        )}
      >
        <Plus aria-hidden />
        <span className={cn(collapsed && "rail:sr-only")}>Create code</span>
      </Link>
      <Menu as="div" className={cn("relative", collapsed && "rail:hidden")}>
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
              href={bulkCreateHref({ folderId, ownerId: null })}
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
