"use client";

import {
  BookOpen,
  Coffee,
  LogOut,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  QrCode,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { LogoMark, Wordmark } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Sheet } from "@/components/ui/Sheet";
import { useProfile } from "@/features/profile/useProfile";
import { cn } from "@/lib/cn";
import { BUY_ME_A_COFFEE_URL } from "@/lib/env";

import { CreateButton } from "./CreateButton";
import { FolderNav } from "./FolderNav";
import {
  isCurrent,
  isEditorPage,
  newCodeHref,
  withWorkspace,
  type ShellTeam,
  type ShellUser,
} from "./nav";
import { UserMenu } from "./UserMenu";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  external?: boolean;
}

const sideLinkClass =
  "flex min-h-11 items-center gap-3 rounded-control px-2.5 text-sm font-medium text-fg-muted hover:bg-surface-2 hover:text-fg aria-[current=page]:bg-surface-2 aria-[current=page]:font-semibold aria-[current=page]:text-fg focus-ring [&_svg]:size-5 [&_svg]:shrink-0";

const tabClass =
  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[13px] font-medium text-fg-muted aria-[current=page]:text-fg focus-ring [&_svg]:size-5";

/** One sidebar link; on a collapsed tablet rail only its icon shows (the label stays for screen readers). */
function SideLink({
  item,
  current,
  expanded,
  onNavigate,
}: {
  item: NavItem;
  current: boolean;
  expanded: boolean;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const className = cn(sideLinkClass, !expanded && "rail:justify-center rail:px-0");
  const content = (
    <>
      <Icon aria-hidden />
      <span className={cn("truncate", !expanded && "rail:sr-only")}>{item.label}</span>
    </>
  );
  return item.external ? (
    <a href={item.href} target="_blank" rel="noopener" className={className}>
      {content}
    </a>
  ) : (
    <Link
      href={item.href}
      aria-current={current ? "page" : undefined}
      onClick={onNavigate}
      className={className}
    >
      {content}
    </Link>
  );
}

/**
 * The signed-in app around every page: a sidebar on desktops, an icon rail on tablets (expand
 * it for labels), and a top bar plus bottom tabs on phones. Whose codes you're looking at comes
 * from ?workspace= and follows every link.
 */
export function AppShell({
  user,
  teams,
  children,
}: {
  user: ShellUser;
  teams: ShellTeam[];
  children: ReactNode;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // A rename or new photo on the settings page shows here straight away.
  const profile = useProfile(user.id);
  const me: ShellUser = profile
    ? { ...user, name: profile.display_name?.trim() || null, avatarUrl: profile.avatar_url }
    : user;
  const team = teams.find((t) => t.ownerId === searchParams.get("workspace")) ?? null;
  // The code editor brings its own bars on phones and keeps the sidebar a rail on tablets.
  const editor = isEditorPage(pathname, searchParams);
  const ownerId = team?.ownerId ?? null;
  // Creating while one of your own folders is open puts the new code in that folder. New codes
  // always go in your own space, so a teammate's folder doesn't count.
  const folderId = pathname === "/codes" && !team ? searchParams.get("folder") : null;
  // The tablet rail stays open only on the page it was opened on: any navigation closes it.
  const here = `${pathname}?${searchParams.toString()}`;
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  const expanded = openedAt === here;
  const [moreOpen, setMoreOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const collapse = () => setOpenedAt(null);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpenedAt(null);
      toggleRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [expanded]);

  const codesHref = withWorkspace("/codes", ownerId);
  const main: NavItem[] = [
    { href: codesHref, label: "Codes", icon: QrCode },
    { href: "/team", label: "Team", icon: Users },
    { href: "/settings", label: "Settings", icon: Settings },
  ];
  const help: NavItem[] = [
    { href: "/developers", label: "Help & API docs", icon: BookOpen },
    { href: BUY_ME_A_COFFEE_URL, label: "Support Ziplume", icon: Coffee, external: true },
  ];
  const more: NavItem[] = [{ href: "/settings", label: "Settings", icon: Settings }, ...help];
  const sideLink = (item: NavItem) => (
    <SideLink
      key={item.label}
      item={item}
      current={!item.external && isCurrent(pathname, item.href)}
      expanded={expanded}
      onNavigate={collapse}
    />
  );

  return (
    <div data-app-shell data-editor={editor || undefined} className="bg-bg text-sm text-fg">
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-primary px-4 py-2 font-semibold text-primary-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      {expanded && (
        <div
          aria-hidden
          onClick={collapse}
          className="fixed inset-0 z-30 hidden bg-black/30 rail:block"
        />
      )}

      <aside
        aria-label="Sidebar"
        data-surface="sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col gap-3 overflow-y-auto border-r border-border bg-surface px-3 py-4 phone:hidden",
          expanded ? "w-64 shadow-pop" : "w-64 rail:w-16",
        )}
      >
        <div className={cn("flex items-center gap-2 px-1", !expanded && "rail:flex-col")}>
          <Link
            href={codesHref}
            aria-label="Ziplume codes"
            onClick={collapse}
            className="flex items-center gap-2.5 rounded-control focus-ring"
          >
            <LogoMark className="size-8" />
            <Wordmark className={cn("text-[15px]", !expanded && "rail:hidden")} />
          </Link>
          <button
            ref={toggleRef}
            type="button"
            aria-label={expanded ? "Collapse menu" : "Expand menu"}
            aria-expanded={expanded}
            onClick={() => setOpenedAt(expanded ? null : here)}
            className="hidden size-10 place-items-center rounded-control text-fg-muted focus-ring hover:bg-surface-2 hover:text-fg rail:grid [&_svg]:size-5"
          >
            {expanded ? <PanelLeftClose aria-hidden /> : <PanelLeftOpen aria-hidden />}
          </button>
        </div>

        <WorkspaceSwitcher user={me} teams={teams} current={team} collapsed={!expanded} />
        <CreateButton folderId={folderId} collapsed={!expanded} onNavigate={collapse} />

        <nav aria-label="Main" className="flex flex-col gap-0.5">
          {sideLink(main[0]!)}
          <FolderNav
            ownerId={team?.ownerId ?? user.id}
            teamId={ownerId}
            canEdit={!team}
            expanded={expanded}
            onNavigate={collapse}
          />
          {main.slice(1).map(sideLink)}
        </nav>

        <div className="mt-auto flex flex-col gap-0.5 border-t border-border pt-3">
          {help.map(sideLink)}
          <div
            className={cn(
              "flex min-h-11 items-center justify-between gap-2 px-2.5 text-sm font-medium text-fg-muted",
              !expanded && "rail:hidden",
            )}
          >
            Theme <ThemeToggle />
          </div>
          <UserMenu user={me} collapsed={!expanded} />
        </div>
      </aside>

      {!editor && (
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-4 sm:hidden">
          <Link
            href={codesHref}
            aria-label="Ziplume codes"
            className="grid size-11 place-items-center rounded-control focus-ring"
          >
            <LogoMark className="size-7" />
          </Link>
          <div className="min-w-0 flex-1">
            <WorkspaceSwitcher user={me} teams={teams} current={team} />
          </div>
        </header>
      )}

      <main
        id="main"
        className={cn(
          "ml-64 px-4 pt-5 pb-(--app-end) sm:px-6 lg:px-10 lg:pt-8 rail:ml-16 phone:ml-0",
          // The editor's own top bar is the first thing on a phone's screen.
          editor && "max-md:pt-0",
        )}
      >
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>

      {!editor && (
        <nav
          aria-label="Main"
          data-tabbar
          className={cn(
            "fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden",
            "grid-cols-4",
          )}
        >
          <Link
            href={codesHref}
            aria-current={isCurrent(pathname, codesHref) ? "page" : undefined}
            className={tabClass}
          >
            <QrCode aria-hidden /> Codes
          </Link>
          <Link href={newCodeHref({ folderId, ownerId: null })} className={tabClass}>
            <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-fg [&_svg]:size-5">
              <Plus aria-hidden />
            </span>
            Create
          </Link>
          <Link
            href="/team"
            aria-current={isCurrent(pathname, "/team") ? "page" : undefined}
            className={tabClass}
          >
            <Users aria-hidden /> Team
          </Link>
          <button type="button" onClick={() => setMoreOpen(true)} className={tabClass}>
            <MoreHorizontal aria-hidden /> More
          </button>
        </nav>
      )}

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <ul className="flex flex-col gap-1 pb-2">
          {more.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <Link
                  href={item.href}
                  onClick={() => setMoreOpen(false)}
                  {...(item.external ? { target: "_blank", rel: "noopener" } : {})}
                  className={sideLinkClass}
                >
                  <Icon aria-hidden /> {item.label}
                </Link>
              </li>
            );
          })}
          <li className="flex min-h-11 items-center justify-between gap-2 px-2.5 text-sm font-medium text-fg">
            Theme <ThemeToggle />
          </li>
          <li>
            <form action="/auth/signout" method="post">
              <button type="submit" className={cn(sideLinkClass, "w-full")}>
                <LogOut aria-hidden /> Sign out
              </button>
            </form>
          </li>
        </ul>
      </Sheet>
    </div>
  );
}
