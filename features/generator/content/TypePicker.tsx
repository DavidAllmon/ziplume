"use client";

import { Radio, RadioGroup } from "@headlessui/react";

import { codeTypeInfo } from "@/lib/qr/code-types";
import { PAGE_TYPE_IDS, QR_TYPE_IDS, type CodeTypeId } from "@/lib/qr/types";

import { TYPE_ICONS } from "./registry";

interface TypePickerProps {
  value: CodeTypeId;
  onChange: (value: CodeTypeId) => void;
  /** A saved code keeps its type; start a new code to pick another. */
  disabled?: boolean;
}

const GROUPS = [
  { id: "codes", title: "Codes", hint: "No account needed", ids: QR_TYPE_IDS },
  { id: "pages", title: "Hosted pages", hint: "Free account", ids: PAGE_TYPE_IDS },
] as const;

export function TypePicker({ value, onChange, disabled }: TypePickerProps) {
  return (
    <RadioGroup
      value={value}
      onChange={onChange}
      disabled={disabled}
      aria-label="What should the QR code open?"
      className="flex flex-col gap-4"
    >
      {GROUPS.map((group) => (
        <div key={group.id} className="flex flex-col gap-2">
          <p className="flex items-baseline gap-2 text-sm">
            <span className="font-semibold text-fg">{group.title}</span>
            <span className="text-fg-muted">{group.hint}</span>
          </p>
          {/* Scrolls sideways on phones, so it can take focus for keyboard scrolling. */}
          <div
            role="group"
            aria-label={group.title}
            tabIndex={0}
            className="-mx-5 scrollbar-none flex snap-x scroll-px-5 gap-2 overflow-x-auto px-5 pb-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:-mx-6 sm:scroll-px-6 sm:px-6 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-6"
          >
            {group.ids.map((id) => {
              const Icon = TYPE_ICONS[id];
              return (
                <Radio
                  key={id}
                  value={id}
                  className="flex h-11 shrink-0 cursor-pointer snap-start items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-semibold whitespace-nowrap text-fg-muted transition-colors select-none hover:border-field-border hover:text-fg data-checked:border-primary data-checked:bg-primary data-checked:text-primary-fg data-disabled:cursor-not-allowed data-disabled:opacity-50 data-checked:data-disabled:opacity-100 data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-ring md:h-auto md:flex-col md:gap-1.5 md:rounded-control md:px-2 md:py-3 md:text-[13px]"
                >
                  <Icon aria-hidden className="size-4 md:size-5" />
                  {codeTypeInfo(id).label}
                </Radio>
              );
            })}
          </div>
        </div>
      ))}
    </RadioGroup>
  );
}
