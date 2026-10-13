import {
  ellipsePath,
  IDENTITY,
  multiply,
  parseColor,
  parsePath,
  parseTransform,
  rectPath,
  scaleOf,
  transformSegments,
  apply,
  type Matrix,
  type Rgb,
  type Segment,
} from "./svg-geometry";

// Converts the SVG that QuickQReate renders (qr-code-styling output plus frames) into an
// Encapsulated PostScript file: vector shapes, clip paths, axial/radial gradients via
// Level 3 shading, embedded images and Latin-1 text in Helvetica.

export interface RasterImage {
  width: number;
  height: number;
  /** RGBA pixels, row by row from the top. */
  data: Uint8ClampedArray;
}

export interface EpsOptions {
  /** Output size in points; the SVG is scaled to fit. */
  width: number;
  height: number;
  title?: string;
  /** Color that semi-transparent image pixels are blended onto (EPS has no alpha). */
  matte?: Rgb;
  /** Decodes an image href (a data URL) at roughly the requested pixel size. */
  rasterize: (href: string, width: number, height: number) => Promise<RasterImage>;
}

const fmt = (n: number) => {
  const r = Math.round(n * 1000) / 1000;
  return Object.is(r, -0) ? "0" : String(r);
};

const rgbOp = ({ r, g, b }: Rgb) => `${fmt(r / 255)} ${fmt(g / 255)} ${fmt(b / 255)}`;

function pathOps(segments: Segment[]): string[] {
  return segments.map((s) => {
    switch (s.op) {
      case "M":
        return `${fmt(s.x)} ${fmt(s.y)} m`;
      case "L":
        return `${fmt(s.x)} ${fmt(s.y)} l`;
      case "C":
        return `${fmt(s.x1)} ${fmt(s.y1)} ${fmt(s.x2)} ${fmt(s.y2)} ${fmt(s.x)} ${fmt(s.y)} c`;
      case "Z":
        return "h";
    }
  });
}

/** Escapes text for a PostScript string, writing Latin-1 characters as octal codes. */
function psString(text: string): string {
  let out = "";
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (char === "(" || char === ")" || char === "\\") out += `\\${char}`;
    else if (code >= 32 && code < 127) out += char;
    else if (code <= 255) out += `\\${code.toString(8).padStart(3, "0")}`;
    else out += "?";
  }
  return `(${out})`;
}

const num = (el: Element, name: string, fallback = 0) => {
  const value = parseFloat(el.getAttribute(name) ?? "");
  return Number.isFinite(value) ? value : fallback;
};

/** The id in url(#id), url('#id') or url("#id"). */
const refId = (value: string | null) =>
  /url\(\s*['"]?#([^'")]+)['"]?\s*\)/.exec(value ?? "")?.[1] ?? null;

const attr = (el: Element, name: string) => el.getAttribute(name) ?? styleProp(el, name);

/** Presentation attributes that children inherit from their parent group. */
const INHERITED = [
  "fill",
  "fill-rule",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "font-size",
  "font-weight",
  "text-anchor",
] as const;
type Inherited = Partial<Record<(typeof INHERITED)[number], string>>;
type Style = (name: (typeof INHERITED)[number]) => string | null;

function styleProp(el: Element, name: string): string | null {
  const style = el.getAttribute("style");
  if (!style) return null;
  const match = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;]+)`).exec(style);
  return match ? match[1]!.trim() : null;
}

/** The outline of a basic shape element in its own coordinates, or null for non-shapes. */
function shapeSegments(el: Element): Segment[] | null {
  switch (el.localName) {
    case "rect": {
      const rx = el.hasAttribute("rx") ? num(el, "rx") : num(el, "ry");
      const ry = el.hasAttribute("ry") ? num(el, "ry") : rx;
      return rectPath(num(el, "x"), num(el, "y"), num(el, "width"), num(el, "height"), rx, ry);
    }
    case "circle":
      return ellipsePath(num(el, "cx"), num(el, "cy"), num(el, "r"), num(el, "r"));
    case "ellipse":
      return ellipsePath(num(el, "cx"), num(el, "cy"), num(el, "rx"), num(el, "ry"));
    case "path":
      return parsePath(el.getAttribute("d") ?? "");
    case "line":
      return [
        { op: "M", x: num(el, "x1"), y: num(el, "y1") },
        { op: "L", x: num(el, "x2"), y: num(el, "y2") },
      ];
    case "polygon":
    case "polyline": {
      const pts =
        (el.getAttribute("points") ?? "")
          .match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi)
          ?.map(Number) ?? [];
      const segs: Segment[] = [];
      for (let i = 0; i + 1 < pts.length; i += 2)
        segs.push({ op: i ? "L" : "M", x: pts[i]!, y: pts[i + 1]! });
      if (el.localName === "polygon" && segs.length) segs.push({ op: "Z" });
      return segs;
    }
    default:
      return null;
  }
}

function bbox(segments: Segment[]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of segments) {
    if (s.op === "Z") continue;
    minX = Math.min(minX, s.x);
    maxX = Math.max(maxX, s.x);
    minY = Math.min(minY, s.y);
    maxY = Math.max(maxY, s.y);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

class EpsWriter {
  private lines: string[] = [];
  private ids = new Map<string, Element>();

  constructor(
    private doc: Document,
    private options: EpsOptions,
  ) {
    for (const el of Array.from(doc.querySelectorAll("[id]"))) this.ids.set(el.id, el);
  }

  emit(...ops: string[]) {
    this.lines.push(...ops);
  }

  output(): string {
    // DSC asks for lines under 255 characters; join short operators onto shared lines.
    const out: string[] = [];
    let line = "";
    for (const op of this.lines) {
      if (op.includes("\n")) {
        if (line) out.push(line);
        out.push(op);
        line = "";
      } else if (line.length + op.length + 1 > 200) {
        out.push(line);
        line = op;
      } else line = line ? `${line} ${op}` : op;
    }
    if (line) out.push(line);
    return out.join("\n");
  }

  async walk(el: Element, matrix: Matrix, inherited: Inherited = {}): Promise<void> {
    const name = el.localName;
    if (
      [
        "defs",
        "clipPath",
        "linearGradient",
        "radialGradient",
        "title",
        "desc",
        "style",
        "metadata",
        "mask",
        "pattern",
        "symbol",
      ].includes(name)
    )
      return;
    if (attr(el, "display") === "none" || attr(el, "visibility") === "hidden") return;

    let m = multiply(matrix, parseTransform(el.getAttribute("transform")));
    if (name === "svg" && el !== this.doc.documentElement) {
      m = multiply(m, [1, 0, 0, 1, num(el, "x"), num(el, "y")]);
      const vb = (el.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
      if (vb.length === 4 && vb[2]! > 0 && vb[3]! > 0) {
        const w = num(el, "width", vb[2]);
        const h = num(el, "height", vb[3]);
        m = multiply(m, [
          w / vb[2]!,
          0,
          0,
          h / vb[3]!,
          -vb[0]! * (w / vb[2]!),
          -vb[1]! * (h / vb[3]!),
        ]);
      }
    }

    const own: Inherited = { ...inherited };
    for (const key of INHERITED) {
      const value = attr(el, key);
      if (value !== null && value !== "inherit") own[key] = value;
    }
    const style: Style = (key) => own[key] ?? null;

    const clip = refId(el.getAttribute("clip-path"));
    const clipEl = clip ? this.ids.get(clip) : undefined;
    if (clipEl) {
      this.emit("gsave");
      this.clipTo(clipEl, m);
    }

    if (name === "svg" || name === "g" || name === "a") {
      for (const child of Array.from(el.children)) await this.walk(child, m, own);
    } else if (name === "image") {
      await this.image(el, m);
    } else if (name === "text") {
      this.text(el, m, style);
    } else {
      const segments = shapeSegments(el);
      if (segments?.length) this.paint(el, segments, m, style);
    }

    if (clipEl) this.emit("grestore");
  }

  private clipTo(clipEl: Element, m: Matrix) {
    const ops: string[] = [];
    let evenOdd = false;
    const add = (child: Element, base: Matrix) => {
      const cm = multiply(base, parseTransform(child.getAttribute("transform")));
      if (child.localName === "g") {
        for (const c of Array.from(child.children)) add(c, cm);
        return;
      }
      const segs = shapeSegments(child);
      if (!segs) return;
      if (attr(child, "clip-rule") === "evenodd") evenOdd = true;
      ops.push(...pathOps(transformSegments(segs, cm)));
    };
    const base = multiply(m, parseTransform(clipEl.getAttribute("transform")));
    for (const child of Array.from(clipEl.children)) add(child, base);
    if (!ops.length) {
      // An empty clip hides everything.
      this.emit("newpath 0 0 m 0 0 l h clip newpath");
      return;
    }
    this.emit("newpath", ...ops, evenOdd ? "eoclip" : "clip", "newpath");
  }

  private paint(el: Element, segments: Segment[], m: Matrix, style: Style) {
    const fill = style("fill") ?? "black";
    const evenOdd = style("fill-rule") === "evenodd";
    const path = pathOps(transformSegments(segments, m));
    const gradient = refId(fill);
    if (gradient) {
      const gradientEl = this.ids.get(gradient);
      if (gradientEl) this.gradientFill(gradientEl, segments, path, m, evenOdd);
    } else {
      const color = parseColor(fill);
      if (color && el.localName !== "line" && el.localName !== "polyline") {
        this.emit(rgbOp(color), "setrgbcolor", "newpath", ...path, evenOdd ? "eofill" : "fill");
      }
    }

    const stroke = parseColor(style("stroke"));
    if (stroke) {
      const width = parseFloat(style("stroke-width") ?? "1") * scaleOf(m);
      const cap = { butt: 0, round: 1, square: 2 }[style("stroke-linecap") ?? "butt"] ?? 0;
      const join = { miter: 0, round: 1, bevel: 2 }[style("stroke-linejoin") ?? "miter"] ?? 0;
      this.emit(
        rgbOp(stroke),
        "setrgbcolor",
        `${fmt(width)} setlinewidth ${cap} setlinecap ${join} setlinejoin`,
        "newpath",
        ...path,
        "stroke",
      );
    }
  }

  private stops(gradientEl: Element): { offset: number; color: Rgb }[] {
    let el: Element | undefined = gradientEl;
    // Gradients can inherit their stops from another gradient via href.
    for (let depth = 0; el && !el.querySelector("stop") && depth < 5; depth++) {
      const href: string | null = el.getAttribute("href") ?? el.getAttribute("xlink:href");
      el = href?.startsWith("#") ? this.ids.get(href.slice(1)) : undefined;
    }
    const stops = Array.from(el?.querySelectorAll("stop") ?? []).map((stop) => {
      const raw = stop.getAttribute("offset") ?? "0";
      const offset = raw.endsWith("%") ? parseFloat(raw) / 100 : parseFloat(raw);
      const color = parseColor(
        stop.getAttribute("stop-color") ?? styleProp(stop, "stop-color"),
      ) ?? { r: 0, g: 0, b: 0 };
      return { offset: Math.min(1, Math.max(0, offset || 0)), color };
    });
    let last = 0;
    for (const stop of stops) {
      stop.offset = Math.max(stop.offset, last);
      last = stop.offset;
    }
    return stops;
  }

  /** A PostScript function mapping 0…1 to the gradient's colors. */
  private gradientFunction(stops: { offset: number; color: Rgb }[]): string {
    const c = (rgb: Rgb) => `[${rgbOp(rgb)}]`;
    if (stops.length === 0)
      return "<< /FunctionType 2 /Domain [0 1] /C0 [0 0 0] /C1 [0 0 0] /N 1 >>";
    const points = [...stops];
    if (points[0]!.offset > 0) points.unshift({ offset: 0, color: points[0]!.color });
    if (points.at(-1)!.offset < 1) points.push({ offset: 1, color: points.at(-1)!.color });
    if (points.length === 2) {
      return `<< /FunctionType 2 /Domain [0 1] /C0 ${c(points[0]!.color)} /C1 ${c(points[1]!.color)} /N 1 >>`;
    }
    const functions: string[] = [];
    const bounds: string[] = [];
    const encode: string[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      functions.push(
        `<< /FunctionType 2 /Domain [0 1] /C0 ${c(points[i]!.color)} /C1 ${c(points[i + 1]!.color)} /N 1 >>`,
      );
      if (i > 0) bounds.push(fmt(points[i]!.offset));
      encode.push("0 1");
    }
    return `<< /FunctionType 3 /Domain [0 1] /Functions [${functions.join(" ")}] /Bounds [${bounds.join(" ")}] /Encode [${encode.join(" ")}] >>`;
  }

  private gradientFill(
    gradientEl: Element,
    segments: Segment[],
    path: string[],
    m: Matrix,
    evenOdd: boolean,
  ) {
    const stops = this.stops(gradientEl);
    if (stops.length === 1) {
      this.emit(
        rgbOp(stops[0]!.color),
        "setrgbcolor",
        "newpath",
        ...path,
        evenOdd ? "eofill" : "fill",
      );
      return;
    }
    // Gradient coordinates are in user space, or relative to the shape's bounding box.
    let gm = m;
    if (gradientEl.getAttribute("gradientUnits") !== "userSpaceOnUse") {
      const box = bbox(segments);
      gm = multiply(m, [box.w, 0, 0, box.h, box.x, box.y]);
    }
    gm = multiply(gm, parseTransform(gradientEl.getAttribute("gradientTransform")));
    const fraction = (name: string, fallback: number) => {
      const raw = gradientEl.getAttribute(name);
      if (raw === null) return fallback;
      return raw.endsWith("%") ? parseFloat(raw) / 100 : parseFloat(raw);
    };
    const userSpace = gradientEl.getAttribute("gradientUnits") === "userSpaceOnUse";
    let shading: string;
    if (gradientEl.localName === "radialGradient") {
      const cx = fraction("cx", userSpace ? 0 : 0.5);
      const cy = fraction("cy", userSpace ? 0 : 0.5);
      const r = fraction("r", userSpace ? 0 : 0.5);
      const fx = fraction("fx", cx);
      const fy = fraction("fy", cy);
      shading = `<< /ShadingType 3 /ColorSpace /DeviceRGB /Coords [${fmt(fx)} ${fmt(fy)} 0 ${fmt(cx)} ${fmt(cy)} ${fmt(r)}] /Extend [true true] /Function ${this.gradientFunction(stops)} >>`;
    } else {
      const x1 = fraction("x1", 0);
      const y1 = fraction("y1", 0);
      const x2 = fraction("x2", userSpace ? 0 : 1);
      const y2 = fraction("y2", 0);
      shading = `<< /ShadingType 2 /ColorSpace /DeviceRGB /Coords [${fmt(x1)} ${fmt(y1)} ${fmt(x2)} ${fmt(y2)}] /Extend [true true] /Function ${this.gradientFunction(stops)} >>`;
    }
    this.emit(
      "gsave",
      "newpath",
      ...path,
      evenOdd ? "eoclip" : "clip",
      "newpath",
      `[${gm.map(fmt).join(" ")}] concat`,
      `${shading}\nshfill`,
      "grestore",
    );
  }

  private async image(el: Element, m: Matrix) {
    const href = el.getAttribute("href") ?? el.getAttribute("xlink:href");
    if (!href?.startsWith("data:")) return;
    const x = num(el, "x");
    const y = num(el, "y");
    const w = num(el, "width");
    const h = num(el, "height");
    if (w <= 0 || h <= 0) return;
    const scale = scaleOf(m);
    // About 300 dpi at the placed size, within sensible bounds.
    const px = Math.max(16, Math.min(1024, Math.round(((w * scale) / 72) * 300)));
    const py = Math.max(16, Math.min(1024, Math.round(((h * scale) / 72) * 300)));
    let raster: RasterImage;
    try {
      raster = await this.options.rasterize(href, px, py);
    } catch {
      return;
    }
    const matte = this.options.matte ?? { r: 255, g: 255, b: 255 };
    const hex: string[] = [];
    let row = "";
    const { data } = raster;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]! / 255;
      for (let ch = 0; ch < 3; ch++) {
        const back = ch === 0 ? matte.r : ch === 1 ? matte.g : matte.b;
        const value = Math.round(data[i + ch]! * a + back * (1 - a));
        row += value.toString(16).padStart(2, "0");
      }
      if (row.length >= 120) {
        hex.push(row);
        row = "";
      }
    }
    if (row) hex.push(row);
    const placement = multiply(m, [w, 0, 0, h, x, y]);
    this.emit(
      "gsave",
      `[${placement.map(fmt).join(" ")}] concat`,
      `<< /ImageType 1 /Width ${raster.width} /Height ${raster.height} /BitsPerComponent 8 /Decode [0 1 0 1 0 1] /ImageMatrix [${raster.width} 0 0 ${raster.height} 0 0] /DataSource currentfile /ASCIIHexDecode filter >>`,
      "/DeviceRGB setcolorspace",
      `image\n${hex.join("\n")}>`,
      "grestore",
    );
  }

  private text(el: Element, m: Matrix, style: Style) {
    const content = (el.textContent ?? "").replace(/\s+/g, " ").trim();
    const color = parseColor(style("fill") ?? "black");
    if (!content || !color) return;
    const size = parseFloat(style("font-size") ?? "16") * scaleOf(m);
    const weight = style("font-weight") ?? "400";
    const bold = weight === "bold" || Number(weight) >= 600;
    const [x, y] = apply(m, num(el, "x"), num(el, "y"));
    const anchor = style("text-anchor") ?? "start";
    const shift =
      anchor === "middle"
        ? " dup stringwidth pop 2 div neg 0 rmoveto"
        : anchor === "end"
          ? " dup stringwidth pop neg 0 rmoveto"
          : "";
    this.emit(
      rgbOp(color),
      "setrgbcolor",
      `/${bold ? "QQBold" : "QQRegular"} findfont ${fmt(size)} scalefont setfont`,
      `${fmt(x)} ${fmt(y)} moveto ${psString(content)}${shift} show`,
    );
  }
}

const PROLOG = [
  "/m {moveto} bind def /l {lineto} bind def /c {curveto} bind def /h {closepath} bind def",
  "/qqreencode { findfont dup length dict begin { 1 index /FID ne { def } { pop pop } ifelse } forall /Encoding ISOLatin1Encoding def currentdict end definefont pop } bind def",
  "/QQBold /Helvetica-Bold qqreencode /QQRegular /Helvetica qqreencode",
];

/** Converts an SVG document to EPS (PostScript Level 3). Needs a DOMParser (browser or jsdom). */
export async function svgToEps(svg: string, options: EpsOptions): Promise<string> {
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  if (root.localName !== "svg") throw new Error("Not an SVG document");
  const vb = (root.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
  const [vx, vy, vw, vh] =
    vb.length === 4 && vb[2]! > 0 && vb[3]! > 0
      ? (vb as [number, number, number, number])
      : [0, 0, num(root, "width", 100), num(root, "height", 100)];
  const { width: W, height: H } = options;
  // SVG's y axis points down; PostScript's points up.
  const rootMatrix: Matrix = multiply([W / vw, 0, 0, -H / vh, 0, H], [1, 0, 0, 1, -vx, -vy]);

  const writer = new EpsWriter(doc, options);
  for (const child of Array.from(root.children))
    await writer.walk(child, multiply(rootMatrix, IDENTITY));

  const title = (options.title ?? "QR code").replace(/[\r\n()\\]/g, " ");
  return [
    "%!PS-Adobe-3.0 EPSF-3.0",
    `%%BoundingBox: 0 0 ${Math.ceil(W)} ${Math.ceil(H)}`,
    `%%HiResBoundingBox: 0 0 ${fmt(W)} ${fmt(H)}`,
    `%%Title: ${title}`,
    "%%Creator: QuickQReate",
    "%%LanguageLevel: 3",
    "%%DocumentData: Clean7Bit",
    "%%EndComments",
    "%%BeginProlog",
    ...PROLOG,
    "%%EndProlog",
    "%%BeginSetup",
    "%%EndSetup",
    "save",
    writer.output(),
    "restore",
    "showpage",
    "%%EOF",
    "",
  ].join("\n");
}
