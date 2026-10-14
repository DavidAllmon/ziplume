"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useReducer, useState } from "react";

import { createCode, designForStorage } from "@/features/codes/api";
import { dynamicPayload, PREVIEW_SLUG } from "@/lib/dynamic/slug";
import { normalizeUrl } from "@/lib/qr/normalize";
import { removeKey } from "@/lib/storage";

import { measure } from "@/lib/qr/capacity";
import { buildFilename } from "@/lib/qr/filename";
import {
  encodeContent,
  filenameLabelFor,
  summarizeContent,
  validateContent,
} from "@/lib/qr/qr-types";
import type { RenderOptions } from "@/lib/qr/renderer";
import { gradientSamples } from "@/lib/color/contrast";
import { checkScannability, withVerification } from "@/lib/qr/scannability";
import { codeTypeInfo } from "@/lib/qr/code-types";
import type { PageContentMap } from "@/lib/pages/types";
import { pageSummary, validatePage } from "@/lib/pages/validate";
import {
  isPageType,
  isStaticType,
  type CodeTypeId,
  type PageTypeId,
  type QrTypeId,
} from "@/lib/qr/types";

import { useScanVerification } from "./preview/useScanVerification";
import { initialState } from "./state/defaults";
import { generatorReducer } from "./state/reducer";
import type { DesignState } from "./state/types";

/** Colors other than the main code color that modules are drawn in. */
export function moduleColors(design: DesignState): string[] {
  const colors: string[] = [];
  if (design.gradientType !== "none") {
    // Sample the blend too: its midpoint can be lighter than either end.
    colors.push(design.gradientColor, ...gradientSamples(design.fgColor, design.gradientColor));
  }
  if (design.cornerColor) colors.push(design.cornerColor);
  if (design.cornerDotColor) colors.push(design.cornerDotColor);
  return colors;
}

const isCodeType = (value: string): value is CodeTypeId => isStaticType(value) || isPageType(value);

/** Versions before October 2026 remembered the last design here; it is cleared on load. */
export const LEGACY_SETTINGS_KEY = "quickqreate:v1";

export function useGenerator() {
  const [state, dispatch] = useReducer(generatorReducer, undefined, initialState);
  /** True when the user switched a new Link code to dynamic (before it is saved). */
  const [wantsDynamic, setWantsDynamic] = useState(false);
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");

  // New codes always start from the defaults. Remove settings an older version remembered.
  useEffect(() => removeKey(LEGACY_SETTINGS_KEY), []);

  // /?type=wifi (from the Codes page's quick starts) opens a new code of that type.
  useEffect(() => {
    if (typeParam && isCodeType(typeParam)) {
      dispatch({ type: "setActiveType", activeType: typeParam });
    }
  }, [typeParam]);

  const { activeType, design, exportSettings } = state;
  const pageType = isPageType(activeType) ? activeType : null;
  const staticType = isPageType(activeType) ? null : activeType;
  const values = staticType ? state.content[staticType] : null;
  const page = pageType ? state.pages[pageType] : null;

  // Hosted pages are always dynamic; Link codes are when the user switches it on.
  const isDynamic = pageType !== null || (wantsDynamic && activeType === "url");
  const destination = isDynamic && activeType === "url" ? normalizeUrl(state.content.url.url) : "";
  // A new dynamic code previews a placeholder ending; downloads wait until it's saved.
  const slug = PREVIEW_SLUG;

  const errors: Record<string, string> = useMemo(() => {
    if (pageType && page) return validatePage(pageType, page);
    if (staticType && values) return validateContent(staticType, values) as Record<string, string>;
    return {};
  }, [pageType, page, staticType, values]);
  const isValid = Object.keys(errors).length === 0;
  const data = useMemo(() => {
    if (pageType) return isValid ? dynamicPayload(slug) : "";
    if (isDynamic) return destination && isValid ? dynamicPayload(slug) : "";
    return staticType && values ? encodeContent(staticType, values) : "";
  }, [pageType, isDynamic, destination, isValid, slug, staticType, values]);

  const measurement = useMemo(
    () => measure(data, design.errorCorrection),
    [data, design.errorCorrection],
  );

  const heuristics = useMemo(
    () =>
      checkScannability({
        data,
        measurement,
        fgColor: design.fgColor,
        extraColors: moduleColors(design),
        bgColor: design.bgColor,
        transparent: design.transparent,
        errorCorrection: design.errorCorrection,
        logoSize: design.logo ? design.logoSize : 0,
        exportSize: exportSettings.format === "svg" ? 4096 : exportSettings.size,
      }),
    [data, measurement, design, exportSettings],
  );

  const renderOptions: RenderOptions = useMemo(
    () => ({ ...design, data, size: exportSettings.size }),
    [design, data, exportSettings.size],
  );

  const verification = useScanVerification(renderOptions, data !== "" && measurement.fits);
  const report = useMemo(
    () => withVerification(heuristics, verification),
    [heuristics, verification],
  );

  const info = codeTypeInfo(activeType);
  const summary =
    pageType && page
      ? pageSummary(pageType, page)
      : data && staticType && values
        ? summarizeContent(staticType, values)
        : "";
  const defaultName = summary || info.label;
  const extension = exportSettings.format === "jpeg" ? "jpg" : exportSettings.format;
  const filename = buildFilename(
    activeType,
    staticType && values ? filenameLabelFor(staticType, values) : summary,
    extension,
  );

  /** Why the code can't be exported yet, or null when it's ready. */
  const blocker =
    pageType && !isValid
      ? (Object.values(errors)[0] ?? info.emptyHint)
      : !data
        ? info.emptyHint
        : !isValid
          ? (Object.values(errors)[0] as string)
          : !measurement.fits
            ? "Too much content for a QR code"
            : isDynamic
              ? pageType
                ? "Save this page first so its QR code works."
                : "Save this dynamic code first so its short link works."
              : null;

  /** Saves a new code to your account. Its page opens next, where it can be changed later. */
  const save = useCallback(
    async (
      name: string,
    ): Promise<{ ok: true; message: string; id: string } | { ok: false; message: string }> => {
      const label = name.trim() || defaultName;
      const { droppedLogo } = designForStorage(design);
      const note = droppedLogo ? " The logo was too large to store and was left out." : "";
      const result = await createCode({
        name: label,
        qrType: activeType,
        content: pageType ? page : values,
        design,
        dynamic: pageType ? { destination: null } : isDynamic ? { destination } : undefined,
      });
      if (!result.ok) return { ok: false, message: result.error };
      return {
        ok: true,
        id: result.value.id,
        message: `Saved “${result.value.name}” to your codes.${note}`,
      };
    },
    [design, destination, values, page, pageType, activeType, isDynamic, defaultName],
  );

  const setField = useCallback(
    (qrType: QrTypeId, field: string, value: string | boolean) =>
      dispatch({ type: "setField", qrType, field, value }),
    [],
  );

  const setPage = useCallback(
    (type: PageTypeId, content: PageContentMap[PageTypeId]) =>
      dispatch({ type: "setPage", pageType: type, content }),
    [],
  );

  const setName = useCallback((name: string) => dispatch({ type: "setName", name }), []);

  return {
    state,
    dispatch,
    setField,
    setPage,
    setName,
    pageType,
    pageErrors: pageType ? errors : {},
    info,
    data,
    measurement,
    report,
    renderOptions,
    summary,
    filename,
    blocker,
    isDynamic,
    slug: null,
    destination,
    defaultName,
    /** Hosted-page files always go to your own space here. */
    workspace: null as { ownerId: string } | null,
    setDynamic: setWantsDynamic,
    save,
  };
}

export type Generator = ReturnType<typeof useGenerator>;
