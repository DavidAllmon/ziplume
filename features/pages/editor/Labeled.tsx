import type { ReactNode } from "react";

/** A visible name over a control that carries its own aria-label (Headless UI ignores aria-labelledby). */
export function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span aria-hidden className="text-sm font-medium text-fg">
        {label}
      </span>
      {children}
    </div>
  );
}
