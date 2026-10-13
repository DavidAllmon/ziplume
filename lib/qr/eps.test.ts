import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import jsQR from "jsqr";
import QRCodeStyling from "qr-code-styling";
import { afterAll, describe, expect, it } from "vitest";

import { svgToEps, type EpsOptions } from "./eps";
import { composeFrame, frameLayout } from "./frame";
import { toStylingOptions, type RenderOptions } from "./renderer";

const BASE: RenderOptions = {
  data: "https://example.com/print",
  size: 600,
  fgColor: "#0F172A",
  bgColor: "#FFFFFF",
  transparent: false,
  gradientType: "none",
  gradientColor: "#4F46E5",
  gradientAngle: 45,
  cornerColor: null,
  cornerDotColor: null,
  dotStyle: "rounded",
  cornerStyle: "rounded",
  cornerDotStyle: "auto",
  errorCorrection: "M",
  logo: null,
  logoIcon: null,
  logoSize: 0.22,
  logoClearSpace: true,
  frame: "none",
  frameText: "SCAN ME",
  frameColor: "#0F172A",
};

async function codeSvg(options: RenderOptions): Promise<string> {
  const qr = new QRCodeStyling(toStylingOptions(options, "svg"));
  const blob = (await qr.getRawData("svg")) as Blob;
  return blob.text();
}

const rasterize: EpsOptions["rasterize"] = async (_href, width, height) => ({
  width,
  height,
  data: new Uint8ClampedArray(width * height * 4).fill(255),
});

const epsFor = (svg: string, width: number, height: number) =>
  svgToEps(svg, { width, height, rasterize, title: "Test (code)" });

function hasGhostscript() {
  try {
    execFileSync("gs", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const dir = mkdtempSync(join(tmpdir(), "qq-eps-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

/**
 * Renders EPS with Ghostscript and decodes it with jsQR. Like a camera, it tries a few
 * scales: jsQR misses some styles at one resolution and reads them at another.
 */
function decodeEps(eps: string): string | null {
  for (const dpi of [200, 120, 300]) {
    const result = decodeEpsAt(eps, dpi);
    if (result) return result;
  }
  return null;
}

function decodeEpsAt(eps: string, dpi: number): string | null {
  const input = join(dir, "code.eps");
  const output = join(dir, "code.ppm");
  writeFileSync(input, eps);
  execFileSync("gs", [
    "-q",
    "-dSAFER",
    "-dBATCH",
    "-dNOPAUSE",
    "-dEPSCrop",
    "-sDEVICE=ppmraw",
    `-r${dpi}`,
    `-sOutputFile=${output}`,
    input,
  ]);
  const ppm = readFileSync(output);
  // Binary PPM: "P6", width, height, max value (with optional # comments), then RGB bytes.
  const header = /^P6(?:\s+|#[^\n]*\n)+(\d+)(?:\s+|#[^\n]*\n)+(\d+)(?:\s+|#[^\n]*\n)+(\d+)\s/.exec(
    ppm.subarray(0, 200).toString("latin1"),
  )!;
  const [width, height] = [Number(header[1]), Number(header[2])];
  const pixels = ppm.subarray(header[0].length);
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0, j = 0; i < width * height; i++, j += 3) {
    rgba.set([pixels[j]!, pixels[j + 1]!, pixels[j + 2]!, 255], i * 4);
  }
  return jsQR(rgba, width, height)?.data ?? null;
}

describe("EPS export", () => {
  it("writes a valid EPS header and vector paths", async () => {
    const eps = await epsFor(await codeSvg(BASE), 144, 144);
    expect(eps.startsWith("%!PS-Adobe-3.0 EPSF-3.0\n%%BoundingBox: 0 0 144 144\n")).toBe(true);
    expect(eps).toContain("%%Title: Test  code ");
    expect(eps).toContain(" clip");
    expect(eps).toContain("%%EOF");
    expect(eps.split("\n").every((line) => line.length < 255)).toBe(true);
  });

  it("draws gradients with Level 3 shading and frames with text", async () => {
    const options: RenderOptions = {
      ...BASE,
      gradientType: "linear",
      gradientColor: "#9D174D",
      frame: "bottom",
    };
    const layout = frameLayout("bottom", 600);
    const code = await codeSvg({ ...options, size: layout.qr.size });
    const svg = composeFrame(code, layout, {
      style: "bottom",
      text: "Scan (me) é",
      color: "#3730A3",
      background: "#FFFFFF",
    });
    const eps = await epsFor(svg, 144, (144 * layout.height) / 600);
    expect(eps).toContain("/ShadingType 2");
    expect(eps).toContain("shfill");
    expect(eps).toContain("(Scan \\(me\\) \\351)");
    expect(eps).toContain("/QQBold findfont");
  });

  it.skipIf(!hasGhostscript())("scans when rendered by Ghostscript", async () => {
    const plain = await epsFor(await codeSvg(BASE), 216, 216);
    expect(decodeEps(plain)).toBe(BASE.data);

    for (const variant of [
      { dotStyle: "dots", cornerStyle: "dot", gradientType: "radial", gradientColor: "#86198F" },
      {
        dotStyle: "classy",
        cornerStyle: "classy",
        cornerColor: "#3F6212",
        cornerDotColor: "#9A3412",
      },
      {
        dotStyle: "leaf",
        cornerStyle: "leaf",
        gradientType: "linear",
        gradientAngle: 135,
        gradientColor: "#0F766E",
      },
      { dotStyle: "fluid", cornerStyle: "rounded", cornerDotStyle: "square" },
    ] as Partial<RenderOptions>[]) {
      const options = { ...BASE, ...variant };
      const layout = frameLayout("bubble", 600);
      const code = await codeSvg({ ...options, size: layout.qr.size });
      const svg = composeFrame(code, layout, {
        style: "bubble",
        text: "SCAN ME",
        color: "#0F172A",
        background: "#FFFFFF",
      });
      const eps = await epsFor(svg, 216, (216 * layout.height) / 600);
      expect(decodeEps(eps), JSON.stringify(variant)).toBe(BASE.data);
    }
  });
});
