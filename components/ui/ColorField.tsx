"use client";

import { useId, useState } from "react";

import { isValidHex, normalizeHex } from "@/lib/color/contrast";
import { cn } from "@/lib/cn";

import { fieldClasses } from "./inputs";

interface ColorFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  /** For a field whose name already shows above it. */
  hideLabel?: boolean;
}

/** A native color picker paired with a hex input that only commits valid colors. */
export function ColorField({ label, value, onChange, disabled, hideLabel }: ColorFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? value;
  const invalid = draft !== null && !isValidHex(draft);

  return (
    <div className={cn("flex flex-col gap-1.5", disabled && "opacity-50")}>
      <label htmlFor={id} className={cn("text-sm font-medium text-fg", hideLabel && "sr-only")}>
        {label}
      </label>
      {/* The swatch sits inside the field so the full hex value fits on narrow phones. */}
      <div className="relative">
        <input
          id={id}
          value={text}
          disabled={disabled}
          spellCheck={false}
          autoComplete="off"
          maxLength={7}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-error` : undefined}
          onChange={(event) => {
            const next = event.target.value.startsWith("#")
              ? event.target.value
              : `#${event.target.value}`;
            setDraft(next);
            const normalized = normalizeHex(next);
            if (normalized && next.length === 7) onChange(normalized);
          }}
          onBlur={() => {
            const normalized = draft ? normalizeHex(draft) : null;
            if (normalized) onChange(normalized);
            if (!draft || normalized) setDraft(null);
          }}
          className={cn(fieldClasses, "h-11 pr-2 pl-11 font-mono uppercase")}
        />
        <span className="absolute top-1/2 left-1.5 size-8 -translate-y-1/2 overflow-hidden rounded-md ring-1 ring-black/15 focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-ring dark:ring-white/20">
          <span aria-hidden className="absolute inset-0" style={{ backgroundColor: value }} />
          <input
            type="color"
            aria-label={`${label} picker`}
            value={value.length === 7 ? value.toLowerCase() : (normalizeHex(value) ?? "#000000")}
            disabled={disabled}
            onChange={(event) => {
              setDraft(null);
              onChange(event.target.value.toUpperCase());
            }}
            className="absolute inset-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          />
        </span>
      </div>
      {invalid && (
        <p id={`${id}-error`} className="text-sm text-danger">
          Use a hex color like #1E293B
        </p>
      )}
    </div>
  );
}
