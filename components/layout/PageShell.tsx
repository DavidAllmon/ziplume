import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { Footer } from "./Footer";
import { Header } from "./Header";

interface PageShellProps {
  children: ReactNode;
  /** Extra classes for <main>, e.g. to change the bottom padding. */
  className?: string;
}

export function PageShell({ children, className }: PageShellProps) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-primary px-4 py-2 font-semibold text-primary-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <Header />
      <main
        id="main"
        className={cn("mx-auto w-full max-w-6xl px-4 pt-6 pb-16 sm:px-6 lg:pt-10", className)}
      >
        {children}
      </main>
      <Footer />
    </>
  );
}
