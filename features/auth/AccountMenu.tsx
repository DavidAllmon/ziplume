"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { LayoutGrid, LogOut, UserRound, Users } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/Button";
import { accountsEnabled } from "@/lib/env";

import { useSession } from "./useSession";

export function AccountMenu() {
  const { user, loading } = useSession();
  if (!accountsEnabled) return null;
  if (loading) return <span aria-hidden className="size-9" />;

  if (!user) {
    return (
      <Link href="/login" className={buttonClasses("primary", "sm")}>
        Sign in
      </Link>
    );
  }

  const label = (user.user_metadata?.full_name as string | undefined) ?? user.email ?? "Account";
  const initial = label.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex items-center gap-1.5">
      <Link href="/dashboard" className={`${buttonClasses("ghost", "sm")} max-sm:hidden`}>
        <LayoutGrid aria-hidden />
        My codes
      </Link>
      <Menu as="div" className="relative">
        <MenuButton
          aria-label="Account menu"
          className="grid size-9 place-items-center rounded-full bg-primary font-display text-sm font-bold text-primary-fg data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-ring"
        >
          {initial}
        </MenuButton>
        <MenuItems
          anchor={{ to: "bottom end", gap: 8 }}
          transition
          className="z-50 w-60 rounded-control border border-border bg-surface p-1.5 shadow-pop transition duration-150 data-closed:-translate-y-1 data-closed:opacity-0"
        >
          <div className="truncate px-3 py-2 text-sm text-fg-muted">{user.email}</div>
          <MenuItem>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg data-focus:bg-surface-2"
            >
              <LayoutGrid aria-hidden className="size-4" /> My codes
            </Link>
          </MenuItem>
          <MenuItem>
            <Link
              href="/dashboard/team"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg data-focus:bg-surface-2"
            >
              <Users aria-hidden className="size-4" /> Team
            </Link>
          </MenuItem>
          <MenuItem>
            <Link
              href="/account"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg data-focus:bg-surface-2"
            >
              <UserRound aria-hidden className="size-4" /> Account
            </Link>
          </MenuItem>
          <MenuItem>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg data-focus:bg-surface-2"
              >
                <LogOut aria-hidden className="size-4" /> Sign out
              </button>
            </form>
          </MenuItem>
        </MenuItems>
      </Menu>
    </div>
  );
}
