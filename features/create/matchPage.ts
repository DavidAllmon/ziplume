import type { DesignState } from "@/features/generator/state/types";
import { contrastRatio, normalizeHex } from "@/lib/color/contrast";

const INK = "#0F172A";

const WHITE = "#FFFFFF";

/** "Match my page": the code and frame take the page's color when it scans well on white
 * (4.5:1), otherwise ink, and the background goes back to white: a light-on-dark code scans badly
 * (spec 5.6). Gradients and corner colors go, so the color shows. */
export function matchPagePatch(pageColor: string, _design: DesignState): Partial<DesignState> {
  const color = normalizeHex(pageColor);
  const chosen = color && contrastRatio(color, WHITE) >= 4.5 ? color : INK;
  return {
    fgColor: chosen,
    frameColor: chosen,
    bgColor: WHITE,
    gradientType: "none",
    cornerColor: null,
    cornerDotColor: null,
  };
}
