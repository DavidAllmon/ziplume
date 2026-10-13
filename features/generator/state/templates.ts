import { DEFAULT_DESIGN } from "./defaults";
import type { DesignState } from "./types";

/** Ready-made looks. Each keeps contrast high enough to scan reliably. */
export const QUICK_STYLES: readonly { id: string; name: string; design: DesignState }[] = [
  { id: "classic", name: "Classic", design: { ...DEFAULT_DESIGN } },
  {
    id: "indigo",
    name: "Indigo glow",
    design: {
      ...DEFAULT_DESIGN,
      fgColor: "#3730A3",
      gradientType: "linear",
      gradientColor: "#9D174D",
      gradientAngle: 45,
      dotStyle: "fluid",
      cornerStyle: "rounded",
      frame: "bottom",
      frameColor: "#3730A3",
    },
  },
  {
    id: "ocean",
    name: "Ocean dots",
    design: {
      ...DEFAULT_DESIGN,
      fgColor: "#0C4A6E",
      bgColor: "#F0F9FF",
      dotStyle: "dots",
      cornerStyle: "dot",
      frame: "badge",
      frameColor: "#0C4A6E",
    },
  },
  {
    id: "sunset",
    name: "Sunset",
    design: {
      ...DEFAULT_DESIGN,
      fgColor: "#9A3412",
      gradientType: "radial",
      gradientColor: "#86198F",
      dotStyle: "classy",
      cornerStyle: "classy",
      frame: "bubble",
      frameColor: "#9A3412",
    },
  },
  {
    id: "mono",
    name: "Mono label",
    design: {
      ...DEFAULT_DESIGN,
      dotStyle: "square",
      cornerStyle: "square",
      frame: "top",
      frameColor: "#0F172A",
    },
  },
  {
    id: "forest",
    name: "Forest leaf",
    design: {
      ...DEFAULT_DESIGN,
      fgColor: "#14532D",
      bgColor: "#F0FDF4",
      dotStyle: "leaf",
      cornerStyle: "rounded",
      cornerColor: "#3F6212",
    },
  },
];
