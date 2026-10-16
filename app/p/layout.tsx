import type { ReactNode } from "react";

/** Hosted pages: no app chrome; each page paints its own wallpaper and footer. */
export default function HostedPageLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh flex-col">{children}</div>;
}
