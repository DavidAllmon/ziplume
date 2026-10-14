import {
  DEFAULT_DESIGN,
  initialState,
  MAX_CODE_NAME,
  MAX_EXPORT_SIZE,
  MIN_EXPORT_SIZE,
} from "./defaults";
import { sanitizePage } from "@/lib/pages/sanitize";
import { isPageType } from "@/lib/qr/types";

import { sanitizeContent, sanitizeDesign } from "./sanitize";
import type { DesignState, GeneratorAction, GeneratorState } from "./types";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hasLogo = (design: DesignState) => Boolean(design.logo || design.logoIcon);

/**
 * Logos hide part of the code, so adding one raises error correction to High; removing it
 * restores what the user had before.
 */
function withLogoChange(state: GeneratorState, design: DesignState): GeneratorState {
  const before = hasLogo(state.design);
  const after = hasLogo(design);
  if (after && !before) {
    return {
      ...state,
      design: { ...design, errorCorrection: "H" },
      ecBeforeLogo: state.design.errorCorrection === "H" ? null : state.design.errorCorrection,
    };
  }
  if (!after && before) {
    return {
      ...state,
      design: { ...design, errorCorrection: state.ecBeforeLogo ?? design.errorCorrection },
      ecBeforeLogo: null,
    };
  }
  return { ...state, design };
}

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

    case "setLogo":
      return withLogoChange(state, {
        ...state.design,
        logo: action.logo,
        logoIcon: action.logo ? null : state.design.logoIcon,
      });

    case "setLogoIcon":
      return withLogoChange(state, {
        ...state.design,
        logoIcon: action.icon,
        logo: action.icon ? null : state.design.logo,
      });

    case "applyDesign": {
      const next = sanitizeDesign(action.design);
      // A template without a logo keeps the one the user already added.
      const design =
        next.logo || next.logoIcon
          ? next
          : { ...next, logo: state.design.logo, logoIcon: state.design.logoIcon };
      if (!hasLogo(design)) return { ...state, design, ecBeforeLogo: null };
      return {
        ...state,
        design: { ...design, errorCorrection: "H" },
        ecBeforeLogo: next.errorCorrection === "H" ? null : next.errorCorrection,
      };
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

    case "setPage":
      return {
        ...state,
        pages: { ...state.pages, [action.pageType]: sanitizePage(action.pageType, action.content) },
      };

    case "setName":
      return { ...state, name: action.name.slice(0, MAX_CODE_NAME) };

    case "reset":
      return initialState();

    case "loadCode": {
      const design = sanitizeDesign(action.design);
      if (isPageType(action.qrType)) {
        return {
          ...state,
          activeType: action.qrType,
          pages: { ...state.pages, [action.qrType]: sanitizePage(action.qrType, action.content) },
          design,
          ecBeforeLogo: null,
          name: "",
        };
      }
      return {
        ...state,
        activeType: action.qrType,
        content: {
          ...state.content,
          [action.qrType]: sanitizeContent(action.qrType, action.content),
        },
        design,
        ecBeforeLogo: null,
        name: "",
      };
    }
  }
}
