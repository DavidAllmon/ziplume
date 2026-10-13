"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

import { measure } from "@/lib/qr/capacity";
import { buildFilename } from "@/lib/qr/filename";
import {
  encodeContent,
  filenameLabelFor,
  QR_TYPES,
  summarizeContent,
  validateContent,
} from "@/lib/qr/qr-types";
import type { RenderOptions } from "@/lib/qr/renderer";
import { checkScannability, withVerification } from "@/lib/qr/scannability";
import type { QrTypeId } from "@/lib/qr/types";

import { useScanVerification } from "./preview/useScanVerification";
import { initialState } from "./state/defaults";
import { loadSettings, saveSettings } from "./state/persistence";
import { generatorReducer } from "./state/reducer";

export function useGenerator() {
  const [state, dispatch] = useReducer(generatorReducer, undefined, initialState);
  const hydrated = useRef(false);

  // Declared before the loading effect so the defaults from the first render are never saved
  // over the user's stored settings.
  useEffect(() => {
    if (hydrated.current) saveSettings(state);
  }, [state]);

  // Saved settings live in localStorage, which only exists in the browser, so they are
  // applied after the first render to keep server and client HTML identical.
  useEffect(() => {
    const saved = loadSettings();
    if (saved) dispatch({ type: "hydrate", saved });
    hydrated.current = true;
  }, []);

  const { activeType, design, exportSettings } = state;
  const values = state.content[activeType];

  const data = useMemo(() => encodeContent(activeType, values), [activeType, values]);
  const errors = useMemo(() => validateContent(activeType, values), [activeType, values]);
  const isValid = Object.keys(errors).length === 0;

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

  const summary = data ? summarizeContent(activeType, values) : "";
  const extension = exportSettings.format === "jpeg" ? "jpg" : exportSettings.format;
  const filename = buildFilename(activeType, filenameLabelFor(activeType, values), extension);

  /** Why the code can't be exported yet, or null when it's ready. */
  const blocker = !data
    ? QR_TYPES[activeType].emptyHint
    : !isValid
      ? (Object.values(errors)[0] as string)
      : !measurement.fits
        ? "Too much content for a QR code"
        : null;

  const setField = useCallback(
    (qrType: QrTypeId, field: string, value: string | boolean) =>
      dispatch({ type: "setField", qrType, field, value }),
    [],
  );

  return {
    state,
    dispatch,
    setField,
    data,
    measurement,
    report,
    renderOptions,
    summary,
    filename,
    blocker,
  };
}

export type Generator = ReturnType<typeof useGenerator>;
