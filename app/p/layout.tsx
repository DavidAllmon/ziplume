import Link from "next/link";
import type { ReactNode } from "react";

import { LogoMark } from "@/components/brand/Logo";

/** Hosted pages: no app chrome, just a small "made with" footer. */
export default function HostedPageLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <div className="flex-1">{children}</div>
      <footer className="flex justify-center px-4 pt-2 pb-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm text-fg-muted focus-ring hover:text-fg"
        >
          <LogoMark variant="small" className="size-5" />
          Made with Ziplume · free QR codes
        </Link>
      </footer>
    </div>
  );
}
