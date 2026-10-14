"use client";

import { Radio, RadioGroup } from "@headlessui/react";

import { Card, CardHeader } from "@/components/ui/Card";
import { ContentForm } from "@/features/generator/content/ContentForm";
import type { ContentEditor } from "@/features/generator/content/types";
import type { CodeTypeId } from "@/lib/qr/types";

import { isContactType, typeDescription } from "../catalog";

const CONTACT_KINDS = [
  {
    value: "contact",
    label: "Save straight to phone",
    hint: "Works without internet. The details can’t change after printing.",
  },
  {
    value: "vcard",
    label: "Show a contact page",
    hint: "A page you can edit any time, with a Save contact button.",
  },
] as const;

/** Step 2: the chosen type's form. Contact first asks how it should work. */
export function ContentSection({
  editor,
  onTypeChange,
}: {
  editor: ContentEditor;
  onTypeChange: (type: CodeTypeId) => void;
}) {
  const type = editor.state.activeType;
  return (
    <Card aria-labelledby="content-heading">
      <CardHeader
        id="content-heading"
        step={2}
        title="Content"
        description={typeDescription(type)}
      />
      <div className="flex flex-col gap-6 px-5 pt-4 pb-6 sm:px-6">
        {isContactType(type) && (
          <RadioGroup
            value={type}
            onChange={onTypeChange}
            aria-label="How should it work?"
            className="grid gap-2 sm:grid-cols-2"
          >
            {CONTACT_KINDS.map((kind) => (
              <Radio
                key={kind.value}
                value={kind.value}
                className="flex min-h-11 cursor-pointer flex-col gap-1 rounded-control border border-border bg-surface p-3 data-checked:border-primary data-checked:bg-surface-2 data-checked:ring-1 data-checked:ring-primary data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-ring"
              >
                <span className="text-sm font-semibold text-fg">{kind.label}</span>
                <span className="text-[13px] text-fg-muted">{kind.hint}</span>
              </Radio>
            ))}
          </RadioGroup>
        )}
        <ContentForm generator={editor} />
      </div>
    </Card>
  );
}
