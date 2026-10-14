"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { Check, ChevronsUpDown } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/ui/Avatar";
import { ROLE_LABELS } from "@/features/teams/roles";
import { cn } from "@/lib/cn";

import {
  menuItemClass,
  menuPanelClass,
  withWorkspace,
  type ShellTeam,
  type ShellUser,
} from "./nav";

interface WorkspaceSwitcherProps {
  user: ShellUser;
  teams: ShellTeam[];
  /** The team whose codes are shown, or null for your own. */
  current: ShellTeam | null;
  /** Icon-only on tablets until the rail is expanded. */
  collapsed?: boolean;
}

/** Choose whose codes you're working in: yours, or a team you belong to. */
export function WorkspaceSwitcher({
  user,
  teams,
  current,
  collapsed = false,
}: WorkspaceSwitcherProps) {
  const label = current ? `${current.label}’s codes` : "My codes";
  return (
    <Menu as="div" className="relative min-w-0">
      <MenuButton
        aria-label={`Switch team (showing ${label})`}
        className={cn(
          "flex min-h-11 w-full items-center gap-2 rounded-control border border-border bg-surface px-2 text-left text-sm font-medium text-fg hover:bg-surface-2 data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-ring",
          collapsed && "max-lg:justify-center max-lg:border-transparent max-lg:px-0",
        )}
      >
        <Avatar
          id={current?.ownerId ?? user.id}
          name={current ? current.label : user.name}
          email={current ? null : user.email}
          src={current ? current.avatarUrl : user.avatarUrl}
          size="sm"
        />
        <span className={cn("min-w-0 flex-1 truncate", collapsed && "max-lg:sr-only")}>
          {label}
        </span>
        <ChevronsUpDown
          aria-hidden
          className={cn("size-4 shrink-0 text-fg-muted", collapsed && "max-lg:hidden")}
        />
      </MenuButton>
      <MenuItems anchor={{ to: "bottom start", gap: 6 }} transition className={menuPanelClass}>
        <MenuItem>
          <Link href="/codes" className={menuItemClass}>
            <Avatar
              id={user.id}
              name={user.name}
              email={user.email}
              src={user.avatarUrl}
              size="sm"
            />
            <span className="min-w-0 flex-1 truncate">My codes</span>
            {!current && <Check aria-hidden className="text-fg-muted" />}
          </Link>
        </MenuItem>
        {teams.map((team) => (
          <MenuItem key={team.ownerId}>
            <Link href={withWorkspace("/codes", team.ownerId)} className={menuItemClass}>
              <Avatar id={team.ownerId} name={team.label} src={team.avatarUrl} size="sm" />
              <span className="min-w-0 flex-1 truncate">{team.label}’s codes</span>
              <span className="text-fg-muted">{ROLE_LABELS[team.role]}</span>
            </Link>
          </MenuItem>
        ))}
        {teams.length === 0 && (
          <p className="px-3 py-2 text-sm text-fg-muted">Teams you join show up here.</p>
        )}
      </MenuItems>
    </Menu>
  );
}
