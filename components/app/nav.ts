import type { TeamRole } from "@/types/supabase";

/** The signed-in person, as the shell shows them. */
export interface ShellUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

/** A team (another person's codes) the signed-in person belongs to. */
export interface ShellTeam {
  ownerId: string;
  /** The owner's name, or their email. */
  label: string;
  role: TeamRole;
  avatarUrl: string | null;
}

/** Adds ?workspace=<owner> for a team's codes; links to your own codes need no parameter. */
export function withWorkspace(href: string, ownerId: string | null): string {
  if (!ownerId) return href;
  const [path, query = ""] = href.split("?");
  const params = new URLSearchParams(query);
  params.set("workspace", ownerId);
  return `${path}?${params.toString()}`;
}

/** The Create page, optionally for a type and inside a folder, in the given team's codes. */
export function newCodeHref({
  type,
  folderId,
  ownerId,
}: {
  type?: string;
  folderId?: string | null;
  ownerId: string | null;
}): string {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (folderId) params.set("folder", folderId);
  const query = params.toString();
  return withWorkspace(query ? `/codes/new?${query}` : "/codes/new", ownerId);
}

/** Whether a nav link points at the current page or a page under it. */
export function isCurrent(pathname: string, href: string): boolean {
  const path = href.split("?")[0]!;
  return pathname === path || pathname.startsWith(`${path}/`);
}

export const menuItemClass =
  "flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-fg data-focus:bg-surface-2 [&_svg]:size-4 [&_svg]:shrink-0";

export const menuPanelClass =
  "z-50 w-64 rounded-control border border-border bg-surface p-1.5 shadow-pop transition duration-150 data-closed:-translate-y-1 data-closed:opacity-0";
