"use client";

import { Radio, RadioGroup } from "@headlessui/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface OptionTilesProps<T extends string> {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string; icon: ReactNode }[];
  /** Grid columns; defaults to four. */
  className?: string;
}

/** A row of large, visual radio buttons. */
export function OptionTiles<T extends string>({
  label,
  value,
  onChange,
  options,
  className,
}: OptionTilesProps<T>) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-fg">{label}</span>
      <RadioGroup
        value={value}
        onChange={onChange}
        aria-label={label}
        className={cn("grid grid-cols-4 gap-2", className)}
      >
        {options.map((option) => (
          <Radio
            key={option.value}
            value={option.value}
            className="flex cursor-pointer flex-col items-center gap-1.5 rounded-control border border-border bg-surface px-1 py-3 text-xs font-medium text-fg-muted transition-colors select-none hover:border-field-border hover:text-fg data-checked:border-primary data-checked:bg-primary-soft data-checked:text-primary-soft-fg data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-ring"
          >
            {option.icon}
            {option.label}
          </Radio>
        ))}
      </RadioGroup>
    </div>
  );
}
