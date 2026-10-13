"use client";

import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

interface SectionProps {
  title: string;
  icon?: ReactNode;
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** A collapsible group inside a card. */
export function Section({ title, icon, summary, defaultOpen, children }: SectionProps) {
  return (
    <Disclosure
      as="div"
      defaultOpen={defaultOpen}
      className="border-t border-border first:border-t-0"
    >
      <DisclosureButton className="group flex min-h-14 w-full items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-2/60 data-focus:outline-2 data-focus:-outline-offset-2 data-focus:outline-ring sm:px-6">
        {icon && <span className="text-fg-muted [&_svg]:size-5">{icon}</span>}
        <span className="flex-1 text-[15px] font-semibold text-fg">{title}</span>
        {summary && <span className="truncate text-sm text-fg-muted">{summary}</span>}
        <ChevronDown
          aria-hidden
          className="size-5 shrink-0 text-fg-muted transition-transform group-data-open:rotate-180"
        />
      </DisclosureButton>
      <DisclosurePanel className="flex flex-col gap-5 px-5 pt-1 pb-6 sm:px-6">
        {children}
      </DisclosurePanel>
    </Disclosure>
  );
}
