import { ShieldCheck } from "lucide-react";

import { REPO_URL } from "./Header";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="flex items-center gap-2">
          <ShieldCheck aria-hidden className="size-4 shrink-0 text-success" />
          Your data never leaves your device. Codes are generated in your browser.
        </p>
        <p>
          Made by{" "}
          <a
            className="font-medium text-link underline-offset-4 hover:underline"
            href="https://github.com/DavidAllmon"
          >
            David Allmon
          </a>{" "}
          ·{" "}
          <a className="font-medium text-link underline-offset-4 hover:underline" href={REPO_URL}>
            Source on GitHub
          </a>{" "}
          · MIT License
        </p>
      </div>
    </footer>
  );
}
