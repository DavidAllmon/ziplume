"use client";

import type { CornerDotStyle, CornerStyle, DotStyle } from "@/lib/qr/types";

import type { DesignState, GeneratorAction } from "../state/types";
import { OptionTiles } from "./OptionTiles";
import { CornerDotIcon, CornerStyleIcon, DotStyleIcon } from "./ShapeIcons";

export const DOT_STYLES = [
  { value: "square", label: "Square" },
  { value: "rounded", label: "Rounded" },
  { value: "fluid", label: "Fluid" },
  { value: "dots", label: "Dots" },
  { value: "classy", label: "Classy" },
  { value: "leaf", label: "Leaf" },
] as const satisfies readonly { value: DotStyle; label: string }[];

export const CORNER_STYLES = [
  { value: "square", label: "Square" },
  { value: "rounded", label: "Rounded" },
  { value: "dot", label: "Circle" },
  { value: "classy", label: "Classy" },
  { value: "leaf", label: "Leaf" },
] as const satisfies readonly { value: CornerStyle; label: string }[];

export const CORNER_DOT_STYLES = [
  { value: "auto", label: "Match" },
  { value: "square", label: "Square" },
  { value: "rounded", label: "Rounded" },
  { value: "dot", label: "Circle" },
  { value: "classy", label: "Classy" },
] as const satisfies readonly { value: CornerDotStyle; label: string }[];

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
        className="grid-cols-3 sm:grid-cols-6"
      />
      <OptionTiles
        label="Corners"
        value={design.cornerStyle}
        onChange={(cornerStyle) => dispatch({ type: "setDesign", patch: { cornerStyle } })}
        options={CORNER_STYLES.map((o) => ({ ...o, icon: <CornerStyleIcon style={o.value} /> }))}
        className="grid-cols-3 sm:grid-cols-5"
      />
      <OptionTiles
        label="Corner centers"
        value={design.cornerDotStyle}
        onChange={(cornerDotStyle) => dispatch({ type: "setDesign", patch: { cornerDotStyle } })}
        options={CORNER_DOT_STYLES.map((o) => ({ ...o, icon: <CornerDotIcon style={o.value} /> }))}
        className="grid-cols-3 sm:grid-cols-5"
      />
    </>
  );
}
