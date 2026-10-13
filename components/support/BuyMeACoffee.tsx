import { Coffee } from "lucide-react";

import { cn } from "@/lib/cn";
import { BUY_ME_A_COFFEE_URL } from "@/lib/env";

interface BuyMeACoffeeProps {
  variant?: "button" | "link" | "card";
  className?: string;
}

/** QuickQReate is free; these links let people support it. */
export function BuyMeACoffee({ variant = "button", className }: BuyMeACoffeeProps) {
  if (variant === "link") {
    return (
      <a
        href={BUY_ME_A_COFFEE_URL}
        target="_blank"
        rel="noopener"
        className={cn(
          "inline-flex items-center gap-1.5 font-medium text-link underline-offset-4 hover:underline",
          className,
        )}
      >
        <Coffee aria-hidden className="size-4" />
        Buy me a coffee
      </a>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={cn(
          "flex flex-col gap-3 rounded-card border border-border bg-surface p-5 sm:flex-row sm:items-center",
          className,
        )}
      >
        <span
          aria-hidden
          className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-fg"
        >
          <Coffee className="size-5" />
        </span>
        <div className="flex-1">
          <p className="font-semibold text-fg">QuickQReate is free, with no limits.</p>
          <p className="text-sm text-fg-muted">
            If it saves you a subscription, a coffee keeps it running.
          </p>
        </div>
        <a
          href={BUY_ME_A_COFFEE_URL}
          target="_blank"
          rel="noopener"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-control bg-fg px-4 text-sm font-semibold text-bg focus-ring transition-opacity hover:opacity-90"
        >
          <Coffee aria-hidden className="size-4" />
          Buy me a coffee
        </a>
      </div>
    );
  }

  return (
    <a
      href={BUY_ME_A_COFFEE_URL}
      target="_blank"
      rel="noopener"
      aria-label="Buy me a coffee"
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-control border border-border px-2.5 text-sm font-semibold text-fg focus-ring transition-colors hover:bg-surface-2",
        className,
      )}
    >
      <Coffee aria-hidden className="size-4 text-primary dark:text-link" />
      <span className="max-md:sr-only">Buy me a coffee</span>
    </a>
  );
}
