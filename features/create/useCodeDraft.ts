"use client";

import { useCallback, useMemo, useReducer } from "react";

import { useScanVerification } from "@/features/generator/preview/useScanVerification";
import type { GeneratorAction } from "@/features/generator/state/types";
import { moduleColors } from "@/features/generator/useGenerator";
import { dynamicPayload, isValidSlug, PREVIEW_SLUG } from "@/lib/dynamic/slug";
import type { PageContentMap } from "@/lib/pages/types";
import { pageSummary, validatePage } from "@/lib/pages/validate";
import { measure } from "@/lib/qr/capacity";
import { normalizeUrl } from "@/lib/qr/normalize";
import { codeTypeInfo } from "@/lib/qr/code-types";
import { buildFilename } from "@/lib/qr/filename";
import {
  encodeContent,
  filenameLabelFor,
  summarizeContent,
  validateContent,
} from "@/lib/qr/qr-types";
import type { RenderOptions } from "@/lib/qr/renderer";
import { checkScannability, withVerification } from "@/lib/qr/scannability";
import { isPageType, type PageTypeId, type QrTypeId } from "@/lib/qr/types";

import {
  createReducer,
  initialCreateState,
  isTrackable,
  settingsErrors,
  type CreateDefaults,
  type CreateState,
  type SettingsErrors,
} from "./state";
import type { Problem } from "./tabs";

/** Trackable links redirect, so they can only point at web pages (the database checks this too). */
const WEB_ADDRESS = /^https?:\/\//i;

/**
 * The Create page's state and everything derived from it: preview data, the scan check, a
 * suggested name and why it can't be created yet. Nothing here is stored anywhere; drafts are
 * the page's explicit job (useDraftStorage).
 */
export function useCodeDraft(
  defaults: CreateDefaults,
  options: { initial?: CreateState; requireSlug?: boolean } = {},
) {
  const [state, dispatch] = useReducer(
    createReducer,
    defaults,
    (fresh) => options.initial ?? initialCreateState(fresh),
  );
  const { code, settings } = state;
  const { activeType, design, exportSettings } = code;
  const pageType = isPageType(activeType) ? activeType : null;
  const staticType = isPageType(activeType) ? null : activeType;
  const values = staticType ? code.content[staticType] : null;
  const page = pageType ? code.pages[pageType] : null;
  const trackable = isTrackable(state);
  /** The ending the preview shows: the chosen one, or a placeholder until the code exists. */
  const previewSlug = settings.slug && isValidSlug(settings.slug) ? settings.slug : PREVIEW_SLUG;

  const errors: Record<string, string> = useMemo(() => {
    if (pageType && page) return validatePage(pageType, page);
    if (staticType && values) return validateContent(staticType, values) as Record<string, string>;
    return {};
  }, [pageType, page, staticType, values]);
  const isValid = Object.keys(errors).length === 0;
  const encoded = useMemo(
    () => (staticType && values ? encodeContent(staticType, values) : ""),
    [staticType, values],
  );
  const data = !isValid
    ? trackable
      ? ""
      : encoded
    : trackable
      ? dynamicPayload(previewSlug)
      : encoded;

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
      : encoded && staticType && values
        ? summarizeContent(staticType, values)
        : "";
  const defaultName = summary || info.label;
  const filename = buildFilename(
    activeType,
    staticType && values ? filenameLabelFor(staticType, values) : summary,
    "png",
  );
  const firstErrorPath = Object.keys(errors)[0] ?? null;
  const settingsProblems: SettingsErrors = trackable
    ? settingsErrors(settings, { requireSlug: options.requireSlug })
    : {};
  const settingsPath = (Object.keys(settingsProblems)[0] ?? null) as keyof SettingsErrors | null;
  /** Why the code can't be created yet, and where to fix it; null when it's ready. */
  const problem: Problem | null =
    staticType && !encoded
      ? { message: info.emptyHint, tab: "content", field: null }
      : !isValid
        ? {
            message: (firstErrorPath && errors[firstErrorPath]) || info.emptyHint,
            tab: "content",
            field: firstErrorPath,
          }
        : trackable && activeType === "url" && !WEB_ADDRESS.test(normalizeUrl(code.content.url.url))
          ? {
              message:
                "Trackable links need a web address (http or https). Turn off Trackable for other links.",
              tab: "content",
              field: null,
            }
          : !measurement.fits
            ? { message: "Too much content for a QR code", tab: "content", field: null }
            : settingsPath
              ? {
                  message: settingsProblems[settingsPath]!,
                  tab: "settings",
                  field: `settings.${settingsPath}`,
                }
              : null;
  /** Why the code can't be created yet, or null when it's ready. */
  const blocker = problem?.message ?? null;

  const codeAction = useCallback(
    (action: GeneratorAction) => dispatch({ type: "code", action }),
    [],
  );
  const setField = useCallback(
    (qrType: QrTypeId, field: string, value: string | boolean) =>
      codeAction({ type: "setField", qrType, field, value }),
    [codeAction],
  );
  const setPage = useCallback(
    (type: PageTypeId, content: PageContentMap[PageTypeId]) =>
      codeAction({ type: "setPage", pageType: type, content }),
    [codeAction],
  );

  return {
    state,
    dispatch,
    codeAction,
    setField,
    setPage,
    pageErrors: pageType ? errors : {},
    pageType,
    trackable,
    previewSlug,
    info,
    data,
    measurement,
    report,
    renderOptions,
    summary,
    defaultName,
    filename,
    blocker,
    problem,
  };
}

export type CodeDraft = ReturnType<typeof useCodeDraft>;
