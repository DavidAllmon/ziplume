"use client";

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";

import { createCode, designForStorage, updateCode } from "@/features/codes/api";
import { editableWorkspace, type Workspace } from "@/features/teams/workspace";
import { dynamicPayload } from "@/lib/dynamic/slug";
import { normalizeUrl } from "@/lib/qr/normalize";
import { removeKey } from "@/lib/storage";
import { getBrowserSupabase } from "@/lib/supabase/client";

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

import { editTransition } from "./editTransition";
import { useScanVerification } from "./preview/useScanVerification";
import { initialState } from "./state/defaults";
import { generatorReducer } from "./state/reducer";
import type { DesignState } from "./state/types";

/** The account copy of the code being edited, once it has been saved or loaded. */
export interface SavedCode {
  id: string;
  name: string;
  isDynamic: boolean;
  slug: string | null;
}

/** Colors other than the main code color that modules are drawn in. */
function moduleColors(design: DesignState): string[] {
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
  const [saved, setSaved] = useState<SavedCode | null>(null);
  /** True when the user switched a new Link code to dynamic (before it is saved). */
  const [wantsDynamic, setWantsDynamic] = useState(false);
  /** A team workspace new codes are saved into (/?workspace=<owner id>); null = your own. */
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const ownerParam = searchParams.get("workspace");
  /** The open code's id, updated before the URL changes so a save never looks like "leave". */
  const savedIdRef = useRef<string | null>(null);

  // New codes always start from the defaults. Remove settings an older version remembered.
  useEffect(() => removeKey(LEGACY_SETTINGS_KEY), []);

  // The address bar decides what is open: /?edit=<id> edits that saved code, plain / is a new
  // code, and /?workspace=<owner id> saves new codes into a team workspace.
  useEffect(() => {
    const transition = editTransition(editId, savedIdRef.current);
    if (transition === "reset") {
      dispatch({ type: "reset" });
      savedIdRef.current = null;
      setSaved(null);
      setWantsDynamic(false);
      setWorkspace(null);
    }
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    if (!editId) {
      if (ownerParam) void editableWorkspace(ownerParam).then(setWorkspace);
      return;
    }
    if (transition !== "load") return;
    let cancelled = false;
    void supabase
      .from("qr_codes")
      .select("id, user_id, name, qr_type, content, design, is_dynamic, slug, destination")
      .eq("id", editId)
      .maybeSingle()
      .then(async ({ data: code }) => {
        if (cancelled || !code || !isCodeType(code.qr_type)) return;
        const { data: session } = await supabase.auth.getSession();
        if (cancelled) return;
        setWorkspace(
          code.user_id !== session.session?.user.id ? await editableWorkspace(code.user_id) : null,
        );
        const linkCode = code.is_dynamic && code.qr_type === "url";
        dispatch({
          type: "loadCode",
          qrType: code.qr_type,
          content: linkCode ? { url: code.destination ?? "" } : code.content,
          design: code.design,
        });
        savedIdRef.current = code.id;
        setSaved({ id: code.id, name: code.name, isDynamic: code.is_dynamic, slug: code.slug });
      });
    return () => {
      cancelled = true;
    };
  }, [editId, ownerParam]);

  const { activeType, design, exportSettings } = state;
  const pageType = isPageType(activeType) ? activeType : null;
  const staticType = isPageType(activeType) ? null : activeType;
  const values = staticType ? state.content[staticType] : null;
  const page = pageType ? state.pages[pageType] : null;

  // Hosted pages are always dynamic; Link codes are when the user switches it on.
  const isDynamic = saved
    ? saved.isDynamic
    : pageType !== null || (wantsDynamic && activeType === "url");
  const destination = isDynamic && activeType === "url" ? normalizeUrl(state.content.url.url) : "";
  // A new dynamic code previews a placeholder ending; downloads wait until it's saved.
  const slug = saved?.slug ?? "PREVIEW";

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
            : isDynamic && !saved
              ? pageType
                ? "Save this page first so its QR code works."
                : "Save this dynamic code first so its short link works."
              : null;

  /** Saves a new code to the account, or updates the one being edited. */
  const save = useCallback(
    async (name: string): Promise<{ ok: boolean; message: string }> => {
      const label = name.trim() || defaultName;
      const { droppedLogo } = designForStorage(design);
      const note = droppedLogo ? " The logo was too large to store and was left out." : "";
      if (saved) {
        const result = await updateCode(saved.id, {
          name: label,
          design,
          ...(pageType
            ? { content: page }
            : saved.isDynamic
              ? { destination, content: { url: destination } }
              : { content: values }),
        });
        if (!result.ok) return { ok: false, message: result.error };
        setSaved({ ...saved, name: result.value.name });
        return { ok: true, message: `Saved changes to “${result.value.name}”.${note}` };
      }
      const result = await createCode({
        ownerId: workspace?.ownerId,
        name: label,
        qrType: activeType,
        content: pageType ? page : values,
        design,
        dynamic: pageType ? { destination: null } : isDynamic ? { destination } : undefined,
      });
      if (!result.ok) return { ok: false, message: result.error };
      const code = result.value;
      savedIdRef.current = code.id;
      setSaved({ id: code.id, name: code.name, isDynamic: code.is_dynamic, slug: code.slug });
      window.history.replaceState(null, "", `/?edit=${code.id}`);
      return { ok: true, message: `Saved “${code.name}” to your codes.${note}` };
    },
    [
      saved,
      design,
      destination,
      values,
      page,
      pageType,
      activeType,
      isDynamic,
      defaultName,
      workspace,
    ],
  );

  /** Leaves edit mode and starts a brand-new code with default settings. */
  const startNew = useCallback(() => {
    dispatch({ type: "reset" });
    savedIdRef.current = null;
    setSaved(null);
    setWantsDynamic(false);
    window.history.replaceState(null, "", workspace ? `/?workspace=${workspace.ownerId}` : "/");
  }, [workspace]);

  /** Saves new codes to your own account instead of a team workspace. */
  const leaveWorkspace = useCallback(() => {
    setWorkspace(null);
    if (!saved) window.history.replaceState(null, "", "/");
  }, [saved]);

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
    slug: saved?.slug ?? null,
    destination,
    saved,
    defaultName,
    workspace,
    leaveWorkspace,
    setDynamic: setWantsDynamic,
    save,
    startNew,
  };
}

export type Generator = ReturnType<typeof useGenerator>;
