import type { DesignState } from "@/features/generator/state/types";
import { contrastRatio, normalizeHex } from "@/lib/color/contrast";

const INK = "#0F172A";

/** "Match my page": the code and frame take the page's color, if it scans well on the code's
 * background (4.5:1); otherwise ink. Gradients and corner colors go, so the color shows. */
export function matchPagePatch(pageColor: string, design: DesignState): Partial<DesignState> {
  const background = design.transparent ? "#FFFFFF" : (normalizeHex(design.bgColor) ?? "#FFFFFF");
  const color = normalizeHex(pageColor);
  const chosen = color && contrastRatio(color, background) >= 4.5 ? color : INK;
  return {
    fgColor: chosen,
    frameColor: chosen,
    gradientType: "none",
    cornerColor: null,
    cornerDotColor: null,
  };
}
