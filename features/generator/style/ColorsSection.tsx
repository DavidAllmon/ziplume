"use client";

import { ArrowLeftRight, Check } from "lucide-react";

import { IconButton } from "@/components/ui/Button";
import { ColorField } from "@/components/ui/ColorField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Slider } from "@/components/ui/Slider";
import { Toggle } from "@/components/ui/Toggle";
import { cn } from "@/lib/cn";

import { COLOR_PRESETS, GRADIENT_PRESETS } from "../state/defaults";
import type { DesignState, GeneratorAction, GradientType } from "../state/types";

interface ColorsSectionProps {
  design: DesignState;
  dispatch: (action: GeneratorAction) => void;
}

const FILL_OPTIONS = [
  { value: "none", label: "Solid" },
  { value: "linear", label: "Linear" },
  { value: "radial", label: "Radial" },
] as const satisfies readonly { value: GradientType; label: string }[];

function Swatch({
  label,
  active,
  background,
  onClick,
}: {
  label: string;
  active: boolean;
  background: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "relative grid size-11 place-items-center overflow-hidden rounded-full border-2 focus-ring transition-transform hover:scale-105",
        active ? "border-primary" : "border-border",
      )}
      style={{ background }}
    >
      {active && (
        <span className="grid size-5 place-items-center rounded-full bg-primary text-primary-fg">
          <Check aria-hidden className="size-3.5" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

export function ColorsSection({ design, dispatch }: ColorsSectionProps) {
  const setDesign = (patch: Partial<DesignState>) => dispatch({ type: "setDesign", patch });
  const gradient = design.gradientType !== "none";
  const customCorners = design.cornerColor !== null;

  return (
    <>
      <div className="flex flex-col gap-2">
        <span id="color-presets" className="text-sm font-medium text-fg">
          Presets
        </span>
        <div role="group" aria-labelledby="color-presets" className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((preset) => (
            <Swatch
              key={preset.name}
              label={`${preset.name} preset`}
              active={
                !gradient &&
                design.fgColor === preset.fg &&
                design.bgColor === preset.bg &&
                !design.transparent
              }
              background={`linear-gradient(135deg, ${preset.bg} 50%, ${preset.fg} 50%)`}
              onClick={() =>
                setDesign({
                  fgColor: preset.fg,
                  bgColor: preset.bg,
                  transparent: false,
                  gradientType: "none",
                })
              }
            />
          ))}
          {GRADIENT_PRESETS.map((preset) => (
            <Swatch
              key={preset.name}
              label={`${preset.name} gradient`}
              active={
                gradient && design.fgColor === preset.from && design.gradientColor === preset.to
              }
              background={`linear-gradient(135deg, ${preset.from}, ${preset.to})`}
              onClick={() =>
                setDesign({
                  fgColor: preset.from,
                  gradientColor: preset.to,
                  gradientType: design.gradientType === "none" ? "linear" : design.gradientType,
                  bgColor: "#FFFFFF",
                  transparent: false,
                })
              }
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span aria-hidden className="text-sm font-medium text-fg">
          Fill
        </span>
        <SegmentedControl
          aria-label="Fill"
          value={design.gradientType}
          onChange={(gradientType) => setDesign({ gradientType })}
          options={FILL_OPTIONS}
        />
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <ColorField
          label={gradient ? "Start color" : "Code color"}
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

      {gradient && (
        <div className="grid gap-4 sm:grid-cols-2">
          <ColorField
            label="End color"
            value={design.gradientColor}
            onChange={(gradientColor) => setDesign({ gradientColor })}
          />
          {design.gradientType === "linear" && (
            <Slider
              label="Direction"
              min={0}
              max={315}
              step={45}
              value={design.gradientAngle - (design.gradientAngle % 45)}
              formatValue={(value) => `${value}°`}
              onChange={(gradientAngle) => setDesign({ gradientAngle })}
            />
          )}
        </div>
      )}

      <Toggle
        label="Transparent background"
        description="For placing the code on your own designs. JPEG files stay opaque."
        checked={design.transparent}
        onChange={(transparent) => setDesign({ transparent })}
      />

      <Toggle
        label="Custom corner colors"
        description="Color the three corner squares separately."
        checked={customCorners}
        onChange={(on) =>
          setDesign(
            on
              ? { cornerColor: design.fgColor, cornerDotColor: null }
              : { cornerColor: null, cornerDotColor: null },
          )
        }
      />
      {customCorners && (
        <div className="grid grid-cols-2 gap-2">
          <ColorField
            label="Corner frame"
            value={design.cornerColor ?? design.fgColor}
            onChange={(cornerColor) => setDesign({ cornerColor })}
          />
          <ColorField
            label="Corner center"
            value={design.cornerDotColor ?? design.cornerColor ?? design.fgColor}
            onChange={(cornerDotColor) => setDesign({ cornerDotColor })}
          />
        </div>
      )}
    </>
  );
}
