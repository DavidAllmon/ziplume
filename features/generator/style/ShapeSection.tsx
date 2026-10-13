"use client";

import type { CornerStyle, DotStyle } from "@/lib/qr/types";

import type { DesignState, GeneratorAction } from "../state/types";
import { OptionTiles } from "./OptionTiles";
import { CornerStyleIcon, DotStyleIcon } from "./ShapeIcons";

export const DOT_STYLES = [
  { value: "square", label: "Square" },
  { value: "rounded", label: "Rounded" },
  { value: "dots", label: "Dots" },
  { value: "classy", label: "Classy" },
] as const satisfies readonly { value: DotStyle; label: string }[];

export const CORNER_STYLES = [
  { value: "square", label: "Square" },
  { value: "rounded", label: "Rounded" },
  { value: "dot", label: "Circle" },
] as const satisfies readonly { value: CornerStyle; label: string }[];

interface ShapeSectionProps {
  design: DesignState;
  dispatch: (action: GeneratorAction) => void;
}

export function ShapeSection({ design, dispatch }: ShapeSectionProps) {
  return (
    <>
      <OptionTiles
        label="Pattern"
        value={design.dotStyle}
        onChange={(dotStyle) => dispatch({ type: "setDesign", patch: { dotStyle } })}
        options={DOT_STYLES.map((o) => ({ ...o, icon: <DotStyleIcon style={o.value} /> }))}
      />
      <OptionTiles
        label="Corners"
        value={design.cornerStyle}
        onChange={(cornerStyle) => dispatch({ type: "setDesign", patch: { cornerStyle } })}
        options={CORNER_STYLES.map((o) => ({ ...o, icon: <CornerStyleIcon style={o.value} /> }))}
      />
    </>
  );
}
