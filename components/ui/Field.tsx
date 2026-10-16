"use client";

import { useId, type ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface FieldControlProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
}

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  /** Extra element rendered next to the label, e.g. an InfoTip. */
  labelAction?: ReactNode;
  /** The card's heading already says it; screen readers still hear the label. */
  hideLabel?: boolean;
  /** A character count, shown at the end of the line under the box. */
  counter?: ReactNode;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}

/** Wires a label, hint and error message to a single form control. */
export function Field({
  label,
  hint,
  error,
  optional,
  labelAction,
  hideLabel = false,
  counter,
  className,
  children,
}: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const counterId = counter ? `${id}-counter` : undefined;
  const describedBy = [errorId, hintId, counterId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className={cn("flex items-center gap-1.5", hideLabel && "sr-only")}>
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
          {optional && <span className="font-normal text-fg-muted"> (optional)</span>}
        </label>
        {labelAction}
      </div>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {(error || hint || counter) && (
        <div className="flex items-start justify-between gap-3">
          {error ? (
            <p id={errorId} className="text-sm text-danger">
              {error}
            </p>
          ) : hint ? (
            <p id={hintId} className="text-sm text-fg-muted">
              {hint}
            </p>
          ) : (
            <span />
          )}
          {counter && (
            <p
              id={counterId}
              className={cn(
                "shrink-0 text-sm tabular-nums",
                error ? "text-danger" : "text-fg-muted",
              )}
            >
              {counter}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
