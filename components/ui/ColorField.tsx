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
}

/** A native color picker paired with a hex input that only commits valid colors. */
export function ColorField({ label, value, onChange, disabled }: ColorFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? value;
  const invalid = draft !== null && !isValidHex(draft);

  return (
    <div className={cn("flex flex-col gap-1.5", disabled && "opacity-50")}>
      <label htmlFor={id} className="text-sm font-medium text-fg">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <span className="relative size-11 shrink-0 overflow-hidden rounded-field border border-field-border focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring">
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
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </span>
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
          className={cn(fieldClasses, "h-11 font-mono text-sm uppercase")}
        />
      </div>
      {invalid && (
        <p id={`${id}-error`} className="text-sm text-danger">
          Use a hex color like #1E293B
        </p>
      )}
    </div>
  );
}
