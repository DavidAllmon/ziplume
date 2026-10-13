import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/cn";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      className={cn("rounded-card border border-border bg-surface shadow-card", className)}
      {...props}
    />
  );
}

interface CardHeaderProps {
  step?: number;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  id?: string;
}

export function CardHeader({ step, title, description, action, id }: CardHeaderProps) {
  return (
    <div className="flex items-start gap-3 px-5 pt-5 sm:px-6 sm:pt-6">
      {step !== undefined && (
        <span
          aria-hidden
          className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-primary-soft font-display text-sm font-bold text-primary-soft-fg"
        >
          {step}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <h2 id={id} className="font-display text-lg font-bold tracking-tight text-fg">
          {title}
        </h2>
        {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
