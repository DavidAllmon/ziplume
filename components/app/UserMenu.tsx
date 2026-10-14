"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { LogOut, Settings } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";

import { menuItemClass, menuPanelClass, type ShellUser } from "./nav";

/** Your photo and name at the bottom of the sidebar, with Settings, Theme and Sign out. */
export function UserMenu({ user, collapsed = false }: { user: ShellUser; collapsed?: boolean }) {
  return (
    <Menu as="div" className="relative">
      <MenuButton
        aria-label="Account menu"
        className={cn(
          "flex min-h-11 w-full items-center gap-2.5 rounded-control p-2 text-left hover:bg-surface-2 data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-ring",
          collapsed && "max-lg:justify-center max-lg:p-1",
        )}
      >
        <Avatar id={user.id} name={user.name} email={user.email} src={user.avatarUrl} size="sm" />
        <span className={cn("min-w-0 flex-1", collapsed && "max-lg:sr-only")}>
          <span className="block truncate text-sm font-medium text-fg">
            {user.name ?? user.email}
          </span>
          {user.name && <span className="block truncate text-sm text-fg-muted">{user.email}</span>}
        </span>
      </MenuButton>
      <MenuItems anchor={{ to: "top start", gap: 8 }} transition className={menuPanelClass}>
        <MenuItem>
          <Link href="/settings" className={menuItemClass}>
            <Settings aria-hidden /> Settings
          </Link>
        </MenuItem>
        <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm text-fg">
          Theme <ThemeToggle />
        </div>
        <MenuItem>
          <form action="/auth/signout" method="post">
            <button type="submit" className={menuItemClass}>
              <LogOut aria-hidden /> Sign out
            </button>
          </form>
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}
