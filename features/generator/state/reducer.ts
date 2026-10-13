import { normalizeHex } from "@/lib/color/contrast";

import { DEFAULT_DESIGN, MAX_EXPORT_SIZE, MIN_EXPORT_SIZE } from "./defaults";
import type { GeneratorAction, GeneratorState } from "./types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function generatorReducer(state: GeneratorState, action: GeneratorAction): GeneratorState {
  switch (action.type) {
    case "setActiveType":
      return { ...state, activeType: action.activeType };

    case "setField": {
      const current = state.content[action.qrType] as unknown as Record<string, unknown>;
      if (!(action.field in current)) return state;
      return {
        ...state,
        content: {
          ...state.content,
          [action.qrType]: { ...current, [action.field]: action.value },
        },
      };
    }

    case "setDesign": {
      const patch = { ...action.patch };
      // A manual error-correction choice replaces whatever we auto-selected for the logo.
      const ecBeforeLogo = patch.errorCorrection ? null : state.ecBeforeLogo;
      return { ...state, design: { ...state.design, ...patch }, ecBeforeLogo };
    }

    case "setLogo": {
      const { design } = state;
      if (action.logo && !design.logo) {
        // Logos hide part of the code, so raise error correction to High automatically.
        return {
          ...state,
          design: { ...design, logo: action.logo, errorCorrection: "H" },
          ecBeforeLogo: design.errorCorrection === "H" ? null : design.errorCorrection,
        };
      }
      if (!action.logo) {
        return {
          ...state,
          design: {
            ...design,
            logo: null,
            errorCorrection: state.ecBeforeLogo ?? design.errorCorrection,
          },
          ecBeforeLogo: null,
        };
      }
      return { ...state, design: { ...design, logo: action.logo } };
    }

    case "swapColors":
      return {
        ...state,
        design: { ...state.design, fgColor: state.design.bgColor, bgColor: state.design.fgColor },
      };

    case "setExport": {
      const next = { ...state.exportSettings, ...action.patch };
      next.size = clamp(Math.round(next.size), MIN_EXPORT_SIZE, MAX_EXPORT_SIZE);
      return { ...state, exportSettings: next };
    }

    case "resetDesign":
      return { ...state, design: { ...DEFAULT_DESIGN }, ecBeforeLogo: null };

    case "hydrate": {
      const { design, exportSettings, activeType } = action.saved;
      return {
        ...state,
        activeType,
        design: {
          ...design,
          fgColor: normalizeHex(design.fgColor) ?? DEFAULT_DESIGN.fgColor,
          bgColor: normalizeHex(design.bgColor) ?? DEFAULT_DESIGN.bgColor,
        },
        exportSettings,
      };
    }
  }
}
