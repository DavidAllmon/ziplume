import type QRCodeStyling from "qr-code-styling";
import type { Options } from "qr-code-styling";

import { measure } from "./capacity";
import type { CornerStyle, DotStyle, ErrorCorrection, ExportFormat } from "./types";
import { toUtf8BinaryString } from "./utf8";

// This module is the only place that knows about qr-code-styling, so the renderer can be
// swapped without touching the UI.

export interface RenderOptions {
  data: string;
  size: number;
  fgColor: string;
  bgColor: string;
  transparent: boolean;
  dotStyle: DotStyle;
  cornerStyle: CornerStyle;
  errorCorrection: ErrorCorrection;
  logo: string | null;
  /** Logo width as a fraction of the code width. */
  logoSize: number;
  logoClearSpace: boolean;
}

const DOTS: Record<DotStyle, NonNullable<Options["dotsOptions"]>["type"]> = {
  square: "square",
  rounded: "rounded",
  dots: "dots",
  classy: "classy-rounded",
};

const CORNERS: Record<
  CornerStyle,
  {
    square: NonNullable<Options["cornersSquareOptions"]>["type"];
    dot: NonNullable<Options["cornersDotOptions"]>["type"];
  }
> = {
  square: { square: "square", dot: "square" },
  rounded: { square: "extra-rounded", dot: "rounded" },
  dot: { square: "dot", dot: "dot" },
};

/** qr-code-styling sizes logos as a share of the error-correction budget, not of the width. */
const EC_BUDGET: Record<ErrorCorrection, number> = { L: 0.07, M: 0.15, Q: 0.25, H: 0.3 };

/** Quiet zone of four modules on each side, as the QR spec requires. */
function quietZone(data: string, errorCorrection: ErrorCorrection, size: number): number {
  const modules = measure(data, errorCorrection).modules ?? 25;
  return Math.round((size * 4) / (modules + 8));
}

export function toStylingOptions(
  options: RenderOptions,
  type: "svg" | "canvas",
  { opaque = false }: { opaque?: boolean } = {},
): Options {
  const { size, fgColor, errorCorrection } = options;
  const corners = CORNERS[options.cornerStyle];
  const transparent = options.transparent && !opaque;
  return {
    type,
    width: size,
    height: size,
    margin: quietZone(options.data, errorCorrection, size),
    data: toUtf8BinaryString(options.data),
    image: options.logo ?? undefined,
    qrOptions: { typeNumber: 0, errorCorrectionLevel: errorCorrection },
    imageOptions: {
      hideBackgroundDots: options.logoClearSpace,
      imageSize: options.logoSize ** 2 / EC_BUDGET[errorCorrection],
      margin: Math.max(1, Math.round(size / 160)),
    },
    dotsOptions: { type: DOTS[options.dotStyle], color: fgColor, roundSize: true },
    cornersSquareOptions: { type: corners.square, color: fgColor },
    cornersDotOptions: { type: corners.dot, color: fgColor },
    backgroundOptions: { color: transparent ? "rgba(0,0,0,0)" : options.bgColor },
  };
}

let loader: Promise<typeof QRCodeStyling> | null = null;

/** Loads qr-code-styling on demand; it needs the DOM, so it never runs during prerendering. */
export function loadRenderer(): Promise<typeof QRCodeStyling> {
  loader ??= import("qr-code-styling").then((mod) => mod.default);
  return loader;
}

export async function renderBlob(options: RenderOptions, format: ExportFormat): Promise<Blob> {
  const QRCode = await loadRenderer();
  // JPEG has no alpha channel, so a transparent background would turn black.
  const qr = new QRCode(toStylingOptions(options, "svg", { opaque: format === "jpeg" }));
  const data = await qr.getRawData(format);
  if (!(data instanceof Blob)) throw new Error("Could not render the QR code");
  return data;
}
