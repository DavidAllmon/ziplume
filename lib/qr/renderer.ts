import type QRCodeStyling from "qr-code-styling";
import type { Options } from "qr-code-styling";

import { measure } from "./capacity";
import { composeFrame, frameLayout, type FrameLayout } from "./frame";
import { logoIconDataUrl } from "./logo-icons";
import { parseColor } from "./svg-geometry";
import { isLatin1 } from "./text-metrics";
import type {
  CornerDotStyle,
  CornerStyle,
  DotStyle,
  ErrorCorrection,
  ExportFormat,
  FrameStyle,
  GradientType,
} from "./types";
import { toUtf8BinaryString } from "./utf8";

// This module is the only place that knows about qr-code-styling, so the renderer can be
// swapped without touching the UI. Every format starts from one SVG: the code drawn by
// qr-code-styling, wrapped in its frame. Raster formats draw that SVG onto a canvas; PDF and
// EPS convert it to vectors.

export interface RenderOptions {
  data: string;
  /** Output width in pixels (the height grows when a frame adds a label). */
  size: number;
  fgColor: string;
  bgColor: string;
  transparent: boolean;
  gradientType: GradientType;
  gradientColor: string;
  gradientAngle: number;
  cornerColor: string | null;
  cornerDotColor: string | null;
  dotStyle: DotStyle;
  cornerStyle: CornerStyle;
  cornerDotStyle: CornerDotStyle;
  errorCorrection: ErrorCorrection;
  logo: string | null;
  logoIcon: string | null;
  /** Logo width as a fraction of the code width. */
  logoSize: number;
  logoClearSpace: boolean;
  frame: FrameStyle;
  frameText: string;
  frameColor: string;
}

type DotType = NonNullable<NonNullable<Options["dotsOptions"]>["type"]>;
type CornerSquareType = NonNullable<NonNullable<Options["cornersSquareOptions"]>["type"]>;
type CornerDotType = NonNullable<NonNullable<Options["cornersDotOptions"]>["type"]>;

const DOTS: Record<DotStyle, DotType> = {
  square: "square",
  rounded: "rounded",
  fluid: "extra-rounded",
  dots: "dots",
  classy: "classy-rounded",
  leaf: "classy",
};

const CORNER_SQUARES: Record<CornerStyle, CornerSquareType> = {
  square: "square",
  rounded: "extra-rounded",
  dot: "dot",
  classy: "classy-rounded",
  leaf: "classy",
};

/** Corner centers that go with each corner frame when the center style is "auto". */
const AUTO_CORNER_DOTS: Record<CornerStyle, CornerDotType> = {
  square: "square",
  rounded: "rounded",
  dot: "dot",
  classy: "classy-rounded",
  leaf: "classy",
};

const CORNER_DOTS: Record<Exclude<CornerDotStyle, "auto">, CornerDotType> = {
  square: "square",
  rounded: "rounded",
  dot: "dot",
  classy: "classy-rounded",
};

/** qr-code-styling sizes logos as a share of the error-correction budget, not of the width. */
const EC_BUDGET: Record<ErrorCorrection, number> = { L: 0.07, M: 0.15, Q: 0.25, H: 0.3 };

/** Quiet zone of four modules on each side, as the QR spec requires. */
function quietZone(data: string, errorCorrection: ErrorCorrection, size: number): number {
  const modules = measure(data, errorCorrection).modules ?? 25;
  return Math.round((size * 4) / (modules + 8));
}

/** The logo to draw: an uploaded image, or a preset icon in the code's color. */
export function logoSource(options: RenderOptions): string | null {
  if (options.logoIcon) {
    const tile = options.transparent ? "#FFFFFF" : options.bgColor;
    return logoIconDataUrl(options.logoIcon, options.cornerColor ?? options.fgColor, tile);
  }
  return options.logo;
}

export function toStylingOptions(
  options: RenderOptions,
  type: "svg" | "canvas",
  { opaque = false }: { opaque?: boolean } = {},
): Options {
  const { size, fgColor, errorCorrection } = options;
  const transparent = options.transparent && !opaque;
  const gradient =
    options.gradientType === "none"
      ? undefined
      : {
          type: options.gradientType,
          rotation: (options.gradientAngle * Math.PI) / 180,
          colorStops: [
            { offset: 0, color: fgColor },
            { offset: 1, color: options.gradientColor },
          ],
        };
  const cornerColor = options.cornerColor ?? undefined;
  const cornerDotColor = options.cornerDotColor ?? cornerColor;
  const logo = logoSource(options);
  return {
    type,
    width: size,
    height: size,
    margin: quietZone(options.data, errorCorrection, size),
    data: toUtf8BinaryString(options.data),
    image: logo ?? undefined,
    qrOptions: { typeNumber: 0, errorCorrectionLevel: errorCorrection },
    imageOptions: {
      hideBackgroundDots: options.logoClearSpace,
      imageSize: options.logoSize ** 2 / EC_BUDGET[errorCorrection],
      margin: Math.max(1, Math.round(size / 160)),
      saveAsBlob: true,
    },
    dotsOptions: { type: DOTS[options.dotStyle], color: fgColor, gradient, roundSize: true },
    cornersSquareOptions: {
      type: CORNER_SQUARES[options.cornerStyle],
      color: cornerColor ?? fgColor,
      gradient: cornerColor ? undefined : gradient,
    },
    cornersDotOptions: {
      type:
        options.cornerDotStyle === "auto"
          ? AUTO_CORNER_DOTS[options.cornerStyle]
          : CORNER_DOTS[options.cornerDotStyle],
      color: cornerDotColor ?? fgColor,
      gradient: cornerDotColor ? undefined : gradient,
    },
    backgroundOptions: { color: transparent ? "rgba(0,0,0,0)" : options.bgColor },
  };
}

let loader: Promise<typeof QRCodeStyling> | null = null;

/** Loads qr-code-styling on demand; it needs the DOM, so it never runs during prerendering. */
export function loadRenderer(): Promise<typeof QRCodeStyling> {
  loader ??= import("qr-code-styling").then((mod) => mod.default);
  return loader;
}

export interface RenderedSvg {
  svg: string;
  width: number;
  height: number;
}

/** The finished artwork (code plus frame) as an SVG document. */
export async function renderSvg(
  options: RenderOptions,
  { opaque = false }: { opaque?: boolean } = {},
): Promise<RenderedSvg> {
  const QRCode = await loadRenderer();
  const layout: FrameLayout = frameLayout(options.frame, options.size);
  const qr = new QRCode(toStylingOptions({ ...options, size: layout.qr.size }, "svg", { opaque }));
  const raw = await qr.getRawData("svg");
  if (!(raw instanceof Blob)) throw new Error("Could not render the QR code");
  const code = await raw.text();
  if (options.frame === "none") return { svg: code, width: layout.width, height: layout.height };
  const background = options.transparent && !opaque ? null : options.bgColor;
  const svg = composeFrame(code, layout, {
    style: options.frame,
    text: options.frameText,
    color: options.frameColor,
    background,
  });
  return { svg, width: layout.width, height: layout.height };
}

const svgUrl = (svg: string) => URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));

async function loadImage(src: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.decoding = "async";
  image.src = src;
  await image.decode();
  return image;
}

/**
 * Paints rendered artwork onto a canvas at its full pixel size. Drawing at high resolution
 * and letting CSS scale it down avoids the hairline seams browsers leave between adjacent
 * modules when they rasterize the SVG small.
 */
export async function paintSvg(
  { svg, width, height }: RenderedSvg,
  canvas: HTMLCanvasElement,
  background?: string,
  /** Checked after the image decodes, so a slow, outdated drawing never replaces a newer one. */
  stillWanted: () => boolean = () => true,
): Promise<void> {
  const url = svgUrl(svg);
  try {
    const image = await loadImage(url);
    if (!stillWanted()) return;
    canvas.width = Math.round(width);
    canvas.height = Math.round(height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");
    context.clearRect(0, 0, canvas.width, canvas.height);
    if (background) {
      context.fillStyle = background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Draws the SVG on a canvas and encodes it. JPEG gets a white backdrop (it has no alpha). */
async function rasterize(rendered: RenderedSvg, format: "png" | "jpeg" | "webp"): Promise<Blob> {
  const canvas = document.createElement("canvas");
  await paintSvg(rendered, canvas, format === "jpeg" ? "#FFFFFF" : undefined);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Could not encode the image"))),
      `image/${format}`,
      0.95,
    ),
  );
}

/** Decodes an image (a data URL) into RGBA pixels at the given size. */
async function rasterizeHref(href: string, width: number, height: number) {
  const image = await loadImage(href);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Canvas is unavailable");
  context.drawImage(image, 0, 0, width, height);
  return { width, height, data: context.getImageData(0, 0, width, height).data };
}

/**
 * PDF and EPS fonts only cover Latin-1, so other text (emoji, CJK…) is drawn into a
 * high-resolution image and placed where the text was.
 */
function imagesForNonLatinText(svg: string): string {
  if (!/<text\b/.test(svg)) return svg;
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  for (const text of Array.from(doc.querySelectorAll("text"))) {
    const content = text.textContent ?? "";
    if (isLatin1(content)) continue;
    const size = parseFloat(text.getAttribute("font-size") ?? "16");
    const x = parseFloat(text.getAttribute("x") ?? "0");
    const y = parseFloat(text.getAttribute("y") ?? "0");
    const font = `700 ${size * 4}px Helvetica, Arial, sans-serif`;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) continue;
    context.font = font;
    const width = Math.ceil(context.measureText(content).width) + 8;
    canvas.width = width;
    canvas.height = Math.ceil(size * 4 * 1.4);
    context.font = font;
    context.fillStyle = text.getAttribute("fill") ?? "#000000";
    context.textBaseline = "alphabetic";
    context.fillText(content, 4, size * 4 * 1.05);
    const image = doc.createElementNS("http://www.w3.org/2000/svg", "image");
    const w = width / 4;
    image.setAttribute("x", String(x - w / 2));
    image.setAttribute("y", String(y - size * 1.05));
    image.setAttribute("width", String(w));
    image.setAttribute("height", String((size * 4 * 1.4) / 4));
    image.setAttribute("href", canvas.toDataURL("image/png"));
    text.replaceWith(image);
  }
  return new XMLSerializer().serializeToString(doc);
}

/** Print size: the pixel width read at 300 dpi, in points. */
const toPoints = (px: number) => (px * 72) / 300;

async function renderPdf(rendered: RenderedSvg): Promise<Blob> {
  const [{ jsPDF }] = await Promise.all([import("jspdf"), import("svg2pdf.js")]);
  const width = toPoints(rendered.width);
  const height = toPoints(rendered.height);
  const doc = new jsPDF({
    unit: "pt",
    format: [width, height],
    orientation: width > height ? "landscape" : "portrait",
    compress: true,
  });
  doc.setProperties({ title: "QR code", creator: "QuickQReate" });
  const svg = imagesForNonLatinText(rendered.svg);
  const element = new DOMParser().parseFromString(svg, "image/svg+xml").documentElement;
  // svg2pdf reads computed styles, so the SVG is attached (off screen) while it converts.
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-10000px;top:0;width:0;height:0;overflow:hidden";
  host.append(document.importNode(element, true));
  document.body.append(host);
  try {
    await doc.svg(host.firstElementChild as Element, { x: 0, y: 0, width, height });
  } finally {
    host.remove();
  }
  return doc.output("blob");
}

async function renderEps(rendered: RenderedSvg, options: RenderOptions): Promise<Blob> {
  const { svgToEps } = await import("./eps");
  const eps = await svgToEps(imagesForNonLatinText(rendered.svg), {
    width: toPoints(rendered.width),
    height: toPoints(rendered.height),
    title: "QR code",
    matte: parseColor(options.transparent ? "#FFFFFF" : options.bgColor) ?? undefined,
    rasterize: rasterizeHref,
  });
  return new Blob([eps], { type: "application/postscript" });
}

export async function renderBlob(options: RenderOptions, format: ExportFormat): Promise<Blob> {
  // JPEG has no alpha channel, and EPS can't express transparency either.
  const rendered = await renderSvg(options, { opaque: format === "jpeg" });
  switch (format) {
    case "svg":
      return new Blob([rendered.svg], { type: "image/svg+xml" });
    case "pdf":
      return renderPdf(rendered);
    case "eps":
      return renderEps(rendered, options);
    default:
      return rasterize(rendered, format);
  }
}
