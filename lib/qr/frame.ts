import { contrastRatio } from "@/lib/color/contrast";

import { textWidthEm } from "./text-metrics";
import type { FrameStyle } from "./types";

// Frames are drawn as plain SVG around the code that qr-code-styling renders, so every
// export format (PNG, SVG, PDF, EPS) gets exactly the same artwork.

export const FRAME_FONT = "Helvetica, Arial, sans-serif";
const INK = "#0F172A";

export interface FrameOptions {
  style: FrameStyle;
  text: string;
  color: string;
  /** Background behind the code; null when the code is transparent. */
  background: string | null;
}

export interface FrameLayout {
  width: number;
  height: number;
  /** Where the code (including its quiet zone) sits, and its size. */
  qr: { x: number; y: number; size: number };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Geometry for a frame around a code, for an output `width` pixels wide. */
export function frameLayout(style: FrameStyle, width: number): FrameLayout {
  const W = width;
  switch (style) {
    case "none":
      return { width: W, height: W, qr: { x: 0, y: 0, size: W } };
    case "bottom":
    case "top": {
      // Whole pixels for the code keep its modules crisp.
      const pad = Math.round(W * 0.045);
      const size = W - 2 * pad;
      const label = Math.round(W * 0.17);
      const height = r2(pad + size + label);
      return { width: W, height, qr: { x: pad, y: style === "top" ? label : pad, size } };
    }
    case "badge": {
      const label = r2(W * 0.15);
      const gap = r2(W * 0.02);
      const pad = r2(W * 0.05);
      return { width: W, height: r2(W + gap + label + pad), qr: { x: 0, y: 0, size: W } };
    }
    case "bubble": {
      const stroke = Math.round(W * 0.03);
      const size = W - 2 * stroke;
      const tail = r2(W * 0.05);
      const label = r2(W * 0.16);
      return {
        width: W,
        height: r2(stroke * 2 + size + W * 0.025 + tail + label),
        qr: { x: stroke, y: stroke, size },
      };
    }
  }
}

/** White or ink, whichever reads better on `color`. */
export function textColorOn(color: string): string {
  try {
    return contrastRatio("#FFFFFF", color) >= contrastRatio(INK, color) ? "#FFFFFF" : INK;
  } catch {
    return "#FFFFFF";
  }
}

const escapeXml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

/** A centered line of text that fits in `maxWidth`, never taller than `maxSize`. */
function label(
  text: string,
  cx: number,
  cy: number,
  maxWidth: number,
  maxSize: number,
  fill: string,
) {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const size = r2(Math.min(maxSize, maxWidth / Math.max(textWidthEm(trimmed), 0.5)));
  // Helvetica's capitals are about 0.72 em tall, so this baseline centers them on cy.
  const baseline = r2(cy + size * 0.36);
  return `<text x="${r2(cx)}" y="${baseline}" text-anchor="middle" font-family="${FRAME_FONT}" font-weight="700" font-size="${size}" fill="${fill}">${escapeXml(trimmed)}</text>`;
}

/** The inside of an `<svg>` document: everything between its opening and closing tags. */
export function svgInner(svg: string): string {
  const match = /<svg\b[^>]*>([\s\S]*)<\/svg>\s*$/.exec(svg);
  if (!match) throw new Error("Not an SVG document");
  return match[1]!;
}

/**
 * Wraps a rendered code (an SVG document `size` pixels square, as laid out by frameLayout)
 * in its frame and call-to-action text. Returns a complete SVG document.
 */
export function composeFrame(qrSvg: string, layout: FrameLayout, options: FrameOptions): string {
  const { width: W, height: H, qr } = layout;
  const { color, background } = options;
  const ink = textColorOn(color);
  const code = `<g transform="translate(${qr.x} ${qr.y})">${svgInner(qrSvg)}</g>`;
  const parts: string[] = [];

  switch (options.style) {
    case "none":
      parts.push(code);
      break;

    case "bottom":
    case "top": {
      const outerRadius = r2(W * 0.07);
      const innerRadius = r2(W * 0.04);
      const labelHeight = H - qr.size - (W - qr.size) / 2;
      const labelCenter =
        options.style === "top" ? labelHeight / 2 : qr.y + qr.size + labelHeight / 2;
      parts.push(
        `<defs><clipPath id="qq-frame-inner"><rect x="${qr.x}" y="${qr.y}" width="${qr.size}" height="${qr.size}" rx="${innerRadius}"/></clipPath></defs>`,
        `<rect x="0" y="0" width="${W}" height="${H}" rx="${outerRadius}" fill="${color}"/>`,
        background
          ? `<rect x="${qr.x}" y="${qr.y}" width="${qr.size}" height="${qr.size}" rx="${innerRadius}" fill="${background}"/>`
          : "",
        `<g clip-path="url(#qq-frame-inner)">${code}</g>`,
        label(options.text, W / 2, labelCenter, W * 0.84, labelHeight * 0.5, ink),
      );
      break;
    }

    case "badge": {
      const labelHeight = W * 0.15;
      const pad = W * 0.05;
      const top = H - pad - labelHeight;
      const pillWidth = W * 0.8;
      if (background) {
        parts.push(
          `<rect x="0" y="0" width="${W}" height="${H}" rx="${r2(W * 0.06)}" fill="${background}"/>`,
        );
      }
      parts.push(
        code,
        `<rect x="${r2((W - pillWidth) / 2)}" y="${r2(top)}" width="${r2(pillWidth)}" height="${r2(labelHeight)}" rx="${r2(labelHeight / 2)}" fill="${color}"/>`,
        label(
          options.text,
          W / 2,
          top + labelHeight / 2,
          pillWidth - labelHeight * 0.9,
          labelHeight * 0.5,
          ink,
        ),
      );
      break;
    }

    case "bubble": {
      const stroke = qr.x;
      const radius = r2(W * 0.06);
      const boxBottom = qr.y + qr.size + stroke;
      const tail = W * 0.05;
      const labelHeight = W * 0.16;
      const bubbleTop = boxBottom + W * 0.025 + tail;
      const bubbleWidth = W * 0.86;
      const bx = (W - bubbleWidth) / 2;
      const half = W * 0.05;
      const innerRadius = r2(Math.max(0, radius - stroke / 2));
      parts.push(
        `<defs><clipPath id="qq-frame-inner"><rect x="${qr.x}" y="${qr.y}" width="${qr.size}" height="${qr.size}" rx="${innerRadius}"/></clipPath></defs>`,
        `<rect x="${r2(stroke / 2)}" y="${r2(stroke / 2)}" width="${r2(W - stroke)}" height="${r2(boxBottom - stroke / 2)}" rx="${radius}" fill="${background ?? "none"}" stroke="${color}" stroke-width="${r2(stroke)}"/>`,
        `<g clip-path="url(#qq-frame-inner)">${code}</g>`,
        `<path d="M${r2(W / 2 - half)} ${r2(bubbleTop + 1)}L${r2(W / 2)} ${r2(bubbleTop - tail)}L${r2(W / 2 + half)} ${r2(bubbleTop + 1)}Z" fill="${color}"/>`,
        `<rect x="${r2(bx)}" y="${r2(bubbleTop)}" width="${r2(bubbleWidth)}" height="${r2(labelHeight)}" rx="${r2(labelHeight * 0.3)}" fill="${color}"/>`,
        label(
          options.text,
          W / 2,
          bubbleTop + labelHeight / 2,
          bubbleWidth * 0.9,
          labelHeight * 0.5,
          ink,
        ),
      );
      break;
    }
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `width="${W}" height="${r2(H)}" viewBox="0 0 ${W} ${r2(H)}">${parts.join("")}</svg>`
  );
}
