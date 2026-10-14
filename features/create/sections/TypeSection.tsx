"use client";

import { Radio, RadioGroup } from "@headlessui/react";
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

import { Card, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/inputs";
import { TYPE_ICONS } from "@/features/generator/content/registry";
import { cn } from "@/lib/cn";
import type { CodeTypeId } from "@/lib/qr/types";

import { COMMON_TYPES, moreTypes, tileFor, typeDescription, typeLabel } from "../catalog";

const tileClass =
  "flex min-h-11 cursor-pointer flex-col gap-1 rounded-control border border-border bg-surface p-3 text-left transition-colors hover:border-field-border data-checked:border-primary data-checked:bg-surface-2 data-checked:ring-1 data-checked:ring-primary data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-ring";

/** Step 1: the eight common types as tiles, and every other type behind a search. */
export function TypeSection({
  value,
  onChange,
  locked = false,
}: {
  value: CodeTypeId;
  onChange: (type: CodeTypeId) => void;
  /** Editing a saved code: show its type, without letting it change. */
  locked?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const panelId = useId();
  const current = tileFor(value);
  const tiles = COMMON_TYPES.includes(current) ? COMMON_TYPES : [...COMMON_TYPES, current];
  const groups = moreTypes(query);

  if (locked) {
    const Icon = TYPE_ICONS[current];
    return (
      <Card aria-labelledby="type-heading">
        <CardHeader id="type-heading" step={1} title="What it opens" />
        <div className="flex flex-col gap-2 px-5 pt-4 pb-6 sm:px-6">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <Icon aria-hidden className="size-4 shrink-0 text-fg" />
            <span className="font-semibold text-fg">{typeLabel(value)}</span>
            <span className="text-fg-muted">{typeDescription(value)}</span>
          </p>
          <p className="text-sm text-fg-muted">
            Set when the code was created. Duplicate it to make a different type.
          </p>
        </div>
      </Card>
    );
  }

  function pick(type: CodeTypeId) {
    onChange(type);
    setOpen(false);
    setQuery("");
  }

  return (
    <Card aria-labelledby="type-heading">
      <CardHeader id="type-heading" step={1} title="What should it open?" />
      <div className="flex flex-col gap-4 px-5 pt-4 pb-6 sm:px-6">
        <RadioGroup
          value={current}
          onChange={onChange}
          aria-label="Code type"
          className="grid grid-cols-2 gap-2 lg:grid-cols-4"
        >
          {tiles.map((id) => {
            const Icon = TYPE_ICONS[id];
            return (
              <Radio key={id} value={id} className={tileClass}>
                <span className="flex items-center gap-2 text-sm font-semibold text-fg">
                  <Icon aria-hidden className="size-4 shrink-0" />
                  {typeLabel(id)}
                </span>
                <span className="text-[13px] text-fg-muted">{typeDescription(id)}</span>
              </Radio>
            );
          })}
        </RadioGroup>

        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(!open)}
          className="flex min-h-11 items-center gap-1.5 self-start rounded-control px-1 text-sm font-semibold text-link focus-ring"
        >
          More types
          <ChevronDown
            aria-hidden
            className={cn("size-4 transition-transform", open && "rotate-180")}
          />
        </button>

        {open && (
          <div id={panelId} className="flex flex-col gap-4">
            <Field label="Search types">
              {(control) => (
                <TextInput
                  {...control}
                  type="search"
                  autoFocus
                  placeholder="Wi-Fi, menu, PDF…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              )}
            </Field>
            {groups.length === 0 && (
              <p className="text-sm text-fg-muted">No types match “{query.trim()}”.</p>
            )}
            {groups.map((group) => (
              <section key={group.title} aria-label={group.title} className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-fg">{group.title}</h3>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {group.ids.map((id) => {
                    const Icon = TYPE_ICONS[id];
                    return (
                      <li key={id}>
                        <button
                          type="button"
                          aria-pressed={current === id}
                          onClick={() => pick(id)}
                          className="flex min-h-11 w-full items-start gap-3 rounded-control border border-border bg-surface p-3 text-left focus-ring hover:bg-surface-2 aria-pressed:border-primary"
                        >
                          <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-muted" />
                          <span className="flex flex-col">
                            <span className="text-sm font-semibold text-fg">{typeLabel(id)}</span>
                            <span className="text-[13px] text-fg-muted">{typeDescription(id)}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
