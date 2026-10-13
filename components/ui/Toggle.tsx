"use client";

import { Description, Field, Label, Switch } from "@headlessui/react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  className?: string;
}

export function Toggle({ checked, onChange, label, description, className }: ToggleProps) {
  return (
    <Field className={cn("flex items-start justify-between gap-4", className)}>
      <span className="flex flex-col">
        <Label className="cursor-pointer text-sm font-medium text-fg">{label}</Label>
        {description && <Description className="text-sm text-fg-muted">{description}</Description>}
      </span>
      <Switch
        checked={checked}
        onChange={onChange}
        className="group relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-field-border bg-surface-2 transition-colors data-checked:border-primary data-checked:bg-primary data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-ring"
      >
        <span
          aria-hidden
          className="ml-0.5 size-5.5 rounded-full bg-white shadow-sm ring-1 ring-black/10 transition-transform group-data-checked:translate-x-5"
        />
      </Switch>
    </Field>
  );
}
