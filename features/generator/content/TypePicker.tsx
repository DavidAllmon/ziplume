"use client";

import { Radio, RadioGroup } from "@headlessui/react";

import { QR_TYPES } from "@/lib/qr/qr-types";
import { QR_TYPE_IDS, type QrTypeId } from "@/lib/qr/types";

import { TYPE_ICONS } from "./registry";

interface TypePickerProps {
  value: QrTypeId;
  onChange: (value: QrTypeId) => void;
  /** A saved code keeps its type; start a new code to pick another. */
  disabled?: boolean;
}

export function TypePicker({ value, onChange, disabled }: TypePickerProps) {
  return (
    <RadioGroup
      value={value}
      onChange={onChange}
      disabled={disabled}
      aria-label="What should the QR code open?"
      className="-mx-5 scrollbar-none flex snap-x scroll-px-5 gap-2 overflow-x-auto px-5 pb-1 sm:-mx-6 sm:scroll-px-6 sm:px-6 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 md:pb-0 lg:grid-cols-7"
    >
      {QR_TYPE_IDS.map((id) => {
        const Icon = TYPE_ICONS[id];
        return (
          <Radio
            key={id}
            value={id}
            className="flex h-11 shrink-0 cursor-pointer snap-start items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-fg-muted transition-colors select-none hover:border-field-border hover:text-fg data-checked:border-accent data-checked:bg-accent data-checked:text-accent-fg data-disabled:cursor-not-allowed data-disabled:opacity-50 data-checked:data-disabled:opacity-100 data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-ring md:h-auto md:flex-col md:gap-1.5 md:rounded-control md:px-2 md:py-3"
          >
            <Icon aria-hidden className="size-4 md:size-5" />
            {QR_TYPES[id].label}
          </Radio>
        );
      })}
    </RadioGroup>
  );
}
