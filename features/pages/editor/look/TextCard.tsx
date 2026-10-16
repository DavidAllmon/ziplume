"use client";

import { Radio, RadioGroup } from "@headlessui/react";

import { Card, CardHeader } from "@/components/ui/Card";
import { ColorField } from "@/components/ui/ColorField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { FONTS } from "@/features/pages/look/fonts";
import { resolveLook } from "@/features/pages/look/resolve";
import { FONT_IDS, type LookChange, type PageLook } from "@/lib/pages/look";

import { Warning } from "./Warning";

/** The font (spec 6.3) and the text color, Auto or custom. */
export function TextCard({
  look,
  onLook,
}: {
  look: PageLook;
  onLook: (change: LookChange) => void;
}) {
  const mode = look.text === "auto" ? "auto" : "custom";
  return (
    <Card aria-labelledby="look-text">
      <CardHeader id="look-text" title="Text" />
      <div className="flex flex-col gap-4 px-5 pt-4 pb-6 sm:px-6">
        <RadioGroup
          value={look.font}
          onChange={(font) => onLook({ ...look, font })}
          aria-label="Font"
          className="grid grid-cols-3 gap-2"
        >
          {FONT_IDS.map((id) => (
            <Radio
              key={id}
              value={id}
              aria-label={FONTS[id].label}
              className="flex min-h-11 cursor-pointer flex-col items-center gap-0.5 rounded-control border border-border px-2 py-2 data-checked:border-primary data-checked:ring-2 data-checked:ring-primary data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-ring"
            >
              <span
                aria-hidden
                className="text-xl font-bold text-fg"
                style={{
                  fontFamily: FONTS[id].heading,
                  fontVariationSettings: FONTS[id].headingSettings,
                }}
              >
                Aa
              </span>
              <span className="text-[13px] font-medium text-fg-muted">{FONTS[id].label}</span>
            </Radio>
          ))}
        </RadioGroup>
        <SegmentedControl
          aria-label="Text color mode"
          size="touch"
          value={mode}
          onChange={(next) =>
            onLook({ ...look, text: next === "auto" ? "auto" : resolveLook(look).text })
          }
          options={[
            { value: "auto", label: "Auto", ariaLabel: "Auto text color" },
            { value: "custom", label: "Custom", ariaLabel: "Custom text color" },
          ]}
        />
        {mode === "auto" ? (
          <p className="text-sm text-fg-muted">Auto always picks the readable one.</p>
        ) : (
          <div className="max-w-56">
            <ColorField
              label="Text color"
              value={look.text}
              onChange={(text) => onLook({ ...look, text })}
            />
          </div>
        )}
        <Warning look={look} id="text" onLook={onLook} fixLabel="Use Auto" />
      </div>
    </Card>
  );
}
