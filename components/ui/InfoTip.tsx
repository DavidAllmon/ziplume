"use client";

import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { Info } from "lucide-react";
import type { ReactNode } from "react";

interface InfoTipProps {
  label: string;
  children: ReactNode;
}

export function InfoTip({ label, children }: InfoTipProps) {
  return (
    <Popover className="relative inline-flex">
      <PopoverButton
        aria-label={label}
        className="grid size-7 place-items-center rounded-full text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg data-focus:outline-2 data-focus:outline-ring data-open:text-primary"
      >
        <Info className="size-4" aria-hidden />
      </PopoverButton>
      <PopoverPanel
        transition
        anchor={{ to: "bottom start", gap: 6, padding: 12 }}
        className="z-50 w-72 rounded-control border border-border bg-surface p-4 text-sm leading-relaxed text-fg-muted shadow-pop transition duration-150 ease-out data-closed:-translate-y-1 data-closed:opacity-0"
      >
        {children}
      </PopoverPanel>
    </Popover>
  );
}
