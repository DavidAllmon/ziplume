"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useId } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";

import { menuItemClass, menuPanelClass, type ShellUser } from "./nav";

/** Your photo and name at the bottom of the sidebar, with Settings and Sign out. */
export function UserMenu({ user, collapsed = false }: { user: ShellUser; collapsed?: boolean }) {
  // The form sits outside the menu so Sign out is a real submit button (keyboard Enter works).
  const formId = useId();
  return (
    <Menu as="div" className="relative">
      <form id={formId} action="/auth/signout" method="post" hidden />
      <MenuButton
        className={cn(
          "flex min-h-11 w-full items-center gap-2.5 rounded-control p-2 text-left hover:bg-surface-2 data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-ring",
          collapsed && "rail:justify-center rail:p-1",
        )}
      >
        <Avatar id={user.id} name={user.name} email={user.email} src={user.avatarUrl} size="sm" />
        <span className={cn("min-w-0 flex-1", collapsed && "rail:sr-only")}>
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
        <MenuItem as="button" type="submit" form={formId} className={menuItemClass}>
          <LogOut aria-hidden /> Sign out
        </MenuItem>
      </MenuItems>
    </Menu>
  );
}
