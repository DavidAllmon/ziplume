"use client";

import { Radio, RadioGroup } from "@headlessui/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Accessible name when the label is an icon. */
  ariaLabel?: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentOption<T>[];
  /** Accessible name. Headless UI ignores aria-labelledby on RadioGroup, so this is required. */
  "aria-label": string;
  /** "touch" is 44px tall on phones and the usual size from 640px. */
  size?: "sm" | "md" | "touch";
  className?: string;
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  size = "md",
  className,
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <RadioGroup
      value={value}
      onChange={onChange}
      aria-label={ariaLabel}
      className={cn(
        "grid auto-cols-fr grid-flow-col gap-1 rounded-control bg-surface-2 p-1",
        className,
      )}
    >
      {options.map((option) => (
        <Radio
          key={option.value}
          value={option.value}
          aria-label={option.ariaLabel}
          className={cn(
            "flex cursor-pointer items-center justify-center gap-1.5 rounded-[0.55rem] font-medium text-fg-muted transition-colors select-none hover:text-fg data-checked:bg-surface data-checked:text-fg data-checked:shadow-sm data-focus:outline-2 data-focus:outline-offset-1 data-focus:outline-ring [&_svg]:size-4",
            size === "sm"
              ? "h-8 px-2 text-xs"
              : size === "touch"
                ? "h-11 px-3 text-sm sm:h-9"
                : "h-9 px-3 text-sm",
          )}
        >
          {option.label}
        </Radio>
      ))}
    </RadioGroup>
  );
}
