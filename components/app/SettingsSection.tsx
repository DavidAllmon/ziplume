import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

/** One block of a settings page: what it is on the left (on top on phones), controls beside it. */
export function SettingsSection({
  id,
  title,
  description,
  danger,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "grid scroll-mt-20 gap-4 rounded-card border bg-surface p-5 sm:p-6 md:grid-cols-[14rem_1fr] md:gap-8",
        danger ? "border-danger/40" : "border-border",
      )}
    >
      <div>
        <h2 className={cn("text-base font-semibold", danger ? "text-danger" : "text-fg")}>
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
