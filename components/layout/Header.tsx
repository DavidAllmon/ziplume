import Link from "next/link";

import { Logo } from "@/components/brand/Logo";

import { GitHubIcon } from "./GitHubIcon";
import { ThemeToggle } from "./ThemeToggle";

export const REPO_URL = "https://github.com/DavidAllmon/QuickQReate";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6 lg:h-16">
        <Link href="/" className="rounded-control focus-ring" aria-label="QuickQReate home">
          <Logo />
        </Link>
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="QuickQReate on GitHub"
            className="grid size-9 place-items-center rounded-control text-fg-muted focus-ring transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <GitHubIcon className="size-5" />
          </a>
        </div>
      </div>
    </header>
  );
}
