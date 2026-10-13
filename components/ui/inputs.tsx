import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/cn";

// 16px text keeps iOS Safari from zooming into focused inputs.
export const fieldClasses =
  "w-full rounded-field border border-field-border bg-surface px-3.5 text-base text-fg transition-colors placeholder:text-fg-subtle hover:border-fg-muted focus:border-primary focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring aria-invalid:border-danger disabled:opacity-60";

export function TextInput({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldClasses, "h-11", className)} {...props} />;
}

export function Textarea({ className, rows = 4, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea rows={rows} className={cn(fieldClasses, "resize-y py-2.5", className)} {...props} />
  );
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(fieldClasses, "h-11 appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-muted"
      />
    </div>
  );
}
