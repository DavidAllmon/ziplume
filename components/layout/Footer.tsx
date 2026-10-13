import { ShieldCheck } from "lucide-react";
import Link from "next/link";

import { BuyMeACoffee } from "@/components/support/BuyMeACoffee";
import { REPO_URL } from "@/lib/env";

import { GitHubIcon } from "./GitHubIcon";

const linkClass = "font-medium text-link underline-offset-4 hover:underline";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-fg-muted sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2">
            <ShieldCheck aria-hidden className="size-4 shrink-0 text-success" />
            Free forever, with no limits. Codes never stop working.
          </p>
          <BuyMeACoffee variant="link" />
        </div>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span>
            Made by{" "}
            <a className={linkClass} href="https://github.com/DavidAllmon">
              David Allmon
            </a>
          </span>
          <Link className={linkClass} href="/privacy">
            Privacy
          </Link>
          <Link className={linkClass} href="/terms">
            Terms
          </Link>
          <a className={`${linkClass} inline-flex items-center gap-1.5`} href={REPO_URL}>
            <GitHubIcon className="size-4" /> Source on GitHub
          </a>
          <span>MIT License</span>
        </nav>
      </div>
    </footer>
  );
}
