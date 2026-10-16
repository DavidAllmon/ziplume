"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import { ColorField } from "@/components/ui/ColorField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { resolveLook } from "@/features/pages/look/resolve";
import type { LookChange, PageLook } from "@/lib/pages/look";

import { Labeled } from "../Labeled";
import { Swatches } from "./Swatches";
import { Warnings } from "./Warning";

const COLORS = [
  "#0F172A",
  "#FFFFFF",
  "#7FE9FF",
  "#0B6E8C",
  "#4F46E5",
  "#0F766E",
  "#B45309",
  "#BE123C",
  "#7C3AED",
  "#831843",
];

/** Shape, style, shadow, color and text color (spec 6.1). */
export function ButtonsCard({
  look,
  onLook,
}: {
  look: PageLook;
  onLook: (change: LookChange) => void;
}) {
  const b = look.button;
  const set = (patch: Partial<PageLook["button"]>) =>
    onLook({ ...look, button: { ...b, ...patch } });
  const textMode = b.text === "auto" ? "auto" : "custom";
  return (
    <Card aria-labelledby="look-buttons">
      <CardHeader id="look-buttons" title="Buttons" />
      <div className="flex flex-col gap-4 px-5 pt-4 pb-6 sm:px-6">
        <Labeled label="Shape">
          <SegmentedControl
            aria-label="Button shape"
            size="touch"
            value={b.shape}
            onChange={(shape) => set({ shape })}
            options={[
              { value: "square", label: "Square" },
              { value: "rounded", label: "Rounded" },
              { value: "pill", label: "Pill" },
            ]}
          />
        </Labeled>
        <Labeled label="Style">
          <SegmentedControl
            aria-label="Button style"
            size="touch"
            value={b.style}
            onChange={(style) => set({ style })}
            options={[
              { value: "solid", label: "Solid" },
              { value: "outline", label: "Outline" },
              { value: "soft", label: "Soft" },
            ]}
          />
        </Labeled>
        <Labeled label="Shadow">
          <SegmentedControl
            aria-label="Button shadow"
            size="touch"
            value={b.shadow}
            onChange={(shadow) => set({ shadow })}
            options={[
              { value: "none", label: "None" },
              { value: "soft", label: "Soft" },
              { value: "hard", label: "Hard" },
            ]}
          />
        </Labeled>
        <Swatches
          name="Button color"
          colors={COLORS}
          value={b.color}
          onPick={(color) => set({ color })}
        />
        <div className="max-w-56">
          <ColorField label="Button color" value={b.color} onChange={(color) => set({ color })} />
        </div>
        <Warnings look={look} onLook={onLook} at="buttonColor" />
        <Labeled label="Text color">
          <SegmentedControl
            aria-label="Button text color mode"
            size="touch"
            value={textMode}
            onChange={(next) =>
              set({ text: next === "auto" ? "auto" : resolveLook(look).buttonText })
            }
            options={[
              { value: "auto", label: "Auto", ariaLabel: "Auto button text" },
              { value: "custom", label: "Custom", ariaLabel: "Custom button text" },
            ]}
          />
        </Labeled>
        {textMode === "custom" && (
          <div className="max-w-56">
            <ColorField
              label="Button text color"
              hideLabel
              value={b.text}
              onChange={(text) => set({ text })}
            />
          </div>
        )}
        <Warnings look={look} onLook={onLook} at="buttonText" />
      </div>
    </Card>
  );
}
