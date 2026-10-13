import { contrastRatio, isValidHex, relativeLuminance } from "@/lib/color/contrast";

import type { Measurement } from "./capacity";
import type { ErrorCorrection } from "./types";

export type ScanStatus = "empty" | "ok" | "warn" | "error";

export interface ScanIssue {
  id:
    "contrast" | "inverted" | "transparent" | "logo" | "overflow" | "density" | "print" | "decode";
  severity: "warn" | "error";
  message: string;
}

export interface ScanReport {
  status: ScanStatus;
  issues: ScanIssue[];
  /** True once the rendered image has been decoded successfully by a real QR reader. */
  verified?: boolean;
}

/** Result of decoding the rendered image: null while a check is pending. */
export type Verification = "verified" | "failed" | null;

/** Folds the real-decoder result into the heuristic report. */
export function withVerification(report: ScanReport, verification: Verification): ScanReport {
  if (report.status === "empty" || verification === null) return report;
  if (verification === "verified") return { ...report, verified: true };
  return {
    status: "error",
    verified: false,
    issues: [
      {
        id: "decode",
        severity: "error",
        message:
          "Our test scanner couldn't read this code. Increase contrast, shrink the logo or raise error correction.",
      },
      ...report.issues.filter((issue) => issue.id !== "decode"),
    ],
  };
}

export interface ScanInput {
  data: string;
  measurement: Measurement;
  fgColor: string;
  /** Other colors the modules use: gradient end and corner colors. */
  extraColors?: readonly string[];
  bgColor: string;
  transparent: boolean;
  errorCorrection: ErrorCorrection;
  /** Logo width as a fraction of the code width (0–1), or 0 for no logo. */
  logoSize: number;
  exportSize: number;
}

/** Share of the code area each level can recover. Logos should stay well under it. */
const RECOVERY: Record<ErrorCorrection, number> = { L: 0.07, M: 0.15, Q: 0.25, H: 0.3 };
/** Quiet zone (in modules) on each side, matching the renderer margin. */
const QUIET_ZONE = 4;
/** Below this many pixels per module, phone cameras struggle at typical distances. */
const MIN_PX_PER_MODULE = 4;

export function checkScannability(input: ScanInput): ScanReport {
  if (!input.data) return { status: "empty", issues: [] };

  const issues: ScanIssue[] = [];
  const { measurement } = input;

  if (!measurement.fits) {
    issues.push({
      id: "overflow",
      severity: "error",
      message: `Too much content: ${measurement.bytes.toLocaleString()} of ${measurement.maxBytes.toLocaleString()} bytes at this error correction level. Shorten it or lower error correction.`,
    });
  }

  const colors = [input.fgColor, ...(input.extraColors ?? [])].filter(isValidHex);
  if (colors.length && isValidHex(input.bgColor) && !input.transparent) {
    // Judge by the weakest color: one faint corner or gradient end is enough to fail a scan.
    const ratio = Math.min(...colors.map((color) => contrastRatio(color, input.bgColor)));
    if (ratio < 3) {
      issues.push({
        id: "contrast",
        severity: "error",
        message: `Contrast is too low (${ratio.toFixed(1)}:1). Use darker code colors or a lighter background.`,
      });
    } else if (ratio < 4.5) {
      issues.push({
        id: "contrast",
        severity: "warn",
        message: `Contrast is borderline (${ratio.toFixed(1)}:1). Some cameras may struggle.`,
      });
    }
    if (colors.some((color) => relativeLuminance(color) > relativeLuminance(input.bgColor))) {
      issues.push({
        id: "inverted",
        severity: "warn",
        message: "Light-on-dark codes can't be read by some scanner apps. Dark on light is safest.",
      });
    }
  }

  if (input.transparent) {
    issues.push({
      id: "transparent",
      severity: "warn",
      message: "Transparent background: place it on a light, plain surface so it stays readable.",
    });
  }

  if (input.logoSize > 0) {
    const coverage = input.logoSize ** 2;
    if (coverage > RECOVERY[input.errorCorrection] * 0.6) {
      issues.push({
        id: "logo",
        severity: "warn",
        message:
          "The logo covers a lot of the code for this error correction level. Use High or a smaller logo.",
      });
    }
  }

  if (measurement.modules) {
    if (measurement.modules > 89) {
      issues.push({
        id: "density",
        severity: "warn",
        message: "This is a dense code. Shorter content scans faster and from farther away.",
      });
    }
    const pxPerModule = input.exportSize / (measurement.modules + QUIET_ZONE * 2);
    if (pxPerModule < MIN_PX_PER_MODULE) {
      issues.push({
        id: "print",
        severity: "warn",
        message: "The export size is small for this much content. Choose a larger size.",
      });
    }
  }

  const status: ScanStatus = issues.some((i) => i.severity === "error")
    ? "error"
    : issues.length
      ? "warn"
      : "ok";
  return { status, issues };
}
