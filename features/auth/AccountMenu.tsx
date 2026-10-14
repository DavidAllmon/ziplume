"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { LayoutGrid, LogOut, UserRound, Users } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/ui/Avatar";
import { buttonClasses } from "@/components/ui/Button";
import { useProfile } from "@/features/profile/useProfile";
import { accountsEnabled } from "@/lib/env";

import { useSession } from "./useSession";

const itemClass =
  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-fg data-focus:bg-surface-2";

export function AccountMenu() {
  const { user, loading } = useSession();
  // Name and photo come from the profile, so a rename or a new photo shows straight away.
  const profile = useProfile(user?.id ?? null);
  if (!accountsEnabled) return null;
  if (loading) return <span aria-hidden className="size-9" />;

  if (!user) {
    return (
      <Link href="/login" className={buttonClasses("primary", "sm")}>
        Sign in
      </Link>
    );
  }

  const name = profile?.display_name?.trim() || null;

  return (
    <div className="flex items-center gap-1.5">
      <Link href="/dashboard" className={`${buttonClasses("ghost", "sm")} max-sm:hidden`}>
        <LayoutGrid aria-hidden />
        My codes
      </Link>
      <Menu as="div" className="relative">
        <MenuButton
          aria-label="Account menu"
          className="rounded-full data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-ring"
        >
          <Avatar id={user.id} name={name} email={user.email} src={profile?.avatar_url} />
        </MenuButton>
        <MenuItems
          anchor={{ to: "bottom end", gap: 8 }}
          transition
          className="z-50 w-64 rounded-control border border-border bg-surface p-1.5 shadow-pop transition duration-150 data-closed:-translate-y-1 data-closed:opacity-0"
        >
          <div className="px-3 py-2">
            <p className="truncate text-sm font-medium text-fg">{name ?? user.email}</p>
            {name && <p className="truncate text-sm text-fg-muted">{user.email}</p>}
          </div>
          <MenuItem>
            <Link href="/dashboard" className={itemClass}>
              <LayoutGrid aria-hidden className="size-4" /> My codes
            </Link>
          </MenuItem>
          <MenuItem>
            <Link href="/dashboard/team" className={itemClass}>
              <Users aria-hidden className="size-4" /> Team
            </Link>
          </MenuItem>
          <MenuItem>
            <Link href="/account" className={itemClass}>
              <UserRound aria-hidden className="size-4" /> Account
            </Link>
          </MenuItem>
          <MenuItem>
            <form action="/auth/signout" method="post">
              <button type="submit" className={`${itemClass} w-full text-left`}>
                <LogOut aria-hidden className="size-4" /> Sign out
              </button>
            </form>
          </MenuItem>
        </MenuItems>
      </Menu>
    </div>
  );
}
