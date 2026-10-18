"use client";

import { useId } from "react";

import { cn } from "@/lib/cn";

import { limitNote } from "./editor/limits";

const box =
  "rounded-xl border border-field-border bg-surface px-3.5 text-base font-normal text-fg focus-visible:outline-2 focus-visible:outline-[var(--page-accent)] aria-invalid:border-danger";

/**
 * A box on a visitor's form: a visible label, its error, and its counter (spec item 2): always
 * for a note, near the limit for one line. Nothing is cut; text over the limit is an error.
 */
export function VisitorField({
  label,
  name,
  value,
  onChange,
  error,
  limit,
  multiline = false,
  optional = false,
  type = "text",
  autoComplete,
  inputMode,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  limit: number;
  multiline?: boolean;
  optional?: boolean;
  type?: "text" | "email" | "tel";
  autoComplete?: string;
  inputMode?: "text" | "email" | "tel";
}) {
  const id = useId();
  const note = limitNote(value.length, limit, multiline);
  const message = error ?? note.error ?? undefined;
  const describedBy =
    [message && `${id}-error`, note.counter && `${id}-count`].filter(Boolean).join(" ") ||
    undefined;
  const control = {
    id,
    name,
    value,
    "aria-invalid": message ? true : undefined,
    "aria-describedby": describedBy,
  };
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
        {optional && <span className="font-normal text-fg-muted"> (optional)</span>}
      </label>
      {multiline ? (
        <textarea
          {...control}
          rows={3}
          onChange={(event) => onChange(event.target.value)}
          className={cn(box, "py-3")}
        />
      ) : (
        <input
          {...control}
          type={type}
          autoComplete={autoComplete}
          inputMode={inputMode}
          onChange={(event) => onChange(event.target.value)}
          className={cn(box, "h-12")}
        />
      )}
      {(message || note.counter) && (
        <div className="flex justify-between gap-3 text-sm">
          {message ? (
            <p id={`${id}-error`} className="text-danger">
              {message}
            </p>
          ) : (
            <span />
          )}
          {note.counter && (
            <p id={`${id}-count`} className="text-fg-muted tabular-nums">
              {note.counter}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
