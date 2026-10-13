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
  className,
  children,
}: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-center gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-fg">
          {label}
          {optional && <span className="font-normal text-fg-muted"> (optional)</span>}
        </label>
        {labelAction}
      </div>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined })}
      {error ? (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={hintId} className="text-sm text-fg-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
