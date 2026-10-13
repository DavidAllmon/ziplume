"use client";

import { ArrowLeftRight, Check } from "lucide-react";

import { IconButton } from "@/components/ui/Button";
import { ColorField } from "@/components/ui/ColorField";
import { Toggle } from "@/components/ui/Toggle";
import { cn } from "@/lib/cn";

import { COLOR_PRESETS } from "../state/defaults";
import type { DesignState, GeneratorAction } from "../state/types";

interface ColorsSectionProps {
  design: DesignState;
  dispatch: (action: GeneratorAction) => void;
}

export function ColorsSection({ design, dispatch }: ColorsSectionProps) {
  const setDesign = (patch: Partial<DesignState>) => dispatch({ type: "setDesign", patch });
  return (
    <>
      <div className="flex flex-col gap-2">
        <span id="color-presets" className="text-sm font-medium text-fg">
          Presets
        </span>
        <div role="group" aria-labelledby="color-presets" className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((preset) => {
            const active =
              design.fgColor === preset.fg && design.bgColor === preset.bg && !design.transparent;
            return (
              <button
                key={preset.name}
                type="button"
                aria-pressed={active}
                aria-label={`${preset.name} preset`}
                title={preset.name}
                onClick={() =>
                  setDesign({ fgColor: preset.fg, bgColor: preset.bg, transparent: false })
                }
                className={cn(
                  "relative grid size-11 place-items-center overflow-hidden rounded-full border-2 focus-ring transition-transform hover:scale-105",
                  active ? "border-primary" : "border-border",
                )}
                style={{
                  background: `linear-gradient(135deg, ${preset.bg} 50%, ${preset.fg} 50%)`,
                }}
              >
                {active && (
                  <span className="grid size-5 place-items-center rounded-full bg-primary text-primary-fg">
                    <Check aria-hidden className="size-3.5" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <ColorField
          label="Code color"
          value={design.fgColor}
          onChange={(fgColor) => setDesign({ fgColor })}
        />
        <IconButton
          label="Swap colors"
          variant="outline"
          onClick={() => dispatch({ type: "swapColors" })}
        >
          <ArrowLeftRight aria-hidden />
        </IconButton>
        <ColorField
          label="Background"
          value={design.bgColor}
          disabled={design.transparent}
          onChange={(bgColor) => setDesign({ bgColor })}
        />
      </div>

      <Toggle
        label="Transparent background"
        description="For placing the code on your own designs. JPEG files stay opaque."
        checked={design.transparent}
        onChange={(transparent) => setDesign({ transparent })}
      />
    </>
  );
}
