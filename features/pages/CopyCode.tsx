"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

/** A coupon code with a one-tap copy button. */
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked: the code stays selectable.
    }
  }
  return (
    <div className="flex items-center gap-2 rounded-2xl border-2 border-dashed border-[var(--page-accent)] p-2 pl-4">
      <span className="min-w-0 flex-1 truncate font-mono text-xl font-bold tracking-wider text-fg select-all">
        {code}
      </span>
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl bg-[var(--page-accent)] px-4 text-sm font-semibold text-[var(--page-accent-fg)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--page-accent)]"
      >
        {copied ? (
          <Check aria-hidden className="size-4" />
        ) : (
          <Copy aria-hidden className="size-4" />
        )}
        {copied ? "Copied" : "Copy"}
      </button>
      <span role="status" className="sr-only">
        {copied ? "Code copied" : ""}
      </span>
    </div>
  );
}
