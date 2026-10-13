// Small, dependency-free SVG geometry helpers: transforms, path parsing (to absolute
// move/line/cubic segments) and colors. Used to convert rendered codes to PostScript.

/** Affine matrix [a b c d e f], mapping (x, y) to (a·x + c·y + e, b·x + d·y + f). */
export type Matrix = readonly [number, number, number, number, number, number];

export const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0];

export function multiply(m: Matrix, n: Matrix): Matrix {
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

export const apply = (m: Matrix, x: number, y: number): [number, number] => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
];

/** How much the matrix scales lengths, on average (for stroke widths and font sizes). */
export const scaleOf = (m: Matrix) => Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));

const NUMBER = /[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
const numbers = (text: string) => (text.match(NUMBER) ?? []).map(Number);

/** Parses an SVG transform attribute (matrix, translate, scale, rotate, skewX, skewY). */
export function parseTransform(value: string | null | undefined): Matrix {
  let result: Matrix = IDENTITY;
  if (!value) return result;
  for (const [, name, args] of value.matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const n = numbers(args ?? "");
    let m: Matrix = IDENTITY;
    switch (name) {
      case "matrix":
        if (n.length === 6) m = n as unknown as Matrix;
        break;
      case "translate":
        m = [1, 0, 0, 1, n[0] ?? 0, n[1] ?? 0];
        break;
      case "scale":
        m = [n[0] ?? 1, 0, 0, n[1] ?? n[0] ?? 1, 0, 0];
        break;
      case "rotate": {
        const a = ((n[0] ?? 0) * Math.PI) / 180;
        const [cx, cy] = [n[1] ?? 0, n[2] ?? 0];
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        m = [cos, sin, -sin, cos, cx - cos * cx + sin * cy, cy - sin * cx - cos * cy];
        break;
      }
      case "skewX":
        m = [1, 0, Math.tan(((n[0] ?? 0) * Math.PI) / 180), 1, 0, 0];
        break;
      case "skewY":
        m = [1, Math.tan(((n[0] ?? 0) * Math.PI) / 180), 0, 1, 0, 0];
        break;
    }
    result = multiply(result, m);
  }
  return result;
}

export type Segment =
  | { op: "M"; x: number; y: number }
  | { op: "L"; x: number; y: number }
  | { op: "C"; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
  | { op: "Z" };

/** Splits path data into commands and their numbers; arc flags may be written without spaces. */
function tokenize(d: string): { command: string; args: number[] }[] {
  const out: { command: string; args: number[] }[] = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g;
  for (const [, command, body] of d.matchAll(re)) {
    if (command === "A" || command === "a") {
      const args: number[] = [];
      let rest = body ?? "";
      let index = 0;
      while (true) {
        rest = rest.replace(/^[\s,]+/, "");
        if (!rest) break;
        const slot = index % 7;
        if (slot === 3 || slot === 4) {
          const flag = /^[01]/.exec(rest);
          if (!flag) break;
          args.push(Number(flag[0]));
          rest = rest.slice(1);
        } else {
          const num = /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/.exec(rest);
          if (!num) break;
          args.push(Number(num[0]));
          rest = rest.slice(num[0].length);
        }
        index++;
      }
      out.push({ command, args });
    } else {
      out.push({ command: command!, args: numbers(body ?? "") });
    }
  }
  return out;
}

/** Converts an elliptical arc to cubic Bézier segments (SVG spec, appendix F.6). */
function arcToCubics(
  x1: number,
  y1: number,
  rxIn: number,
  ryIn: number,
  angle: number,
  largeArc: number,
  sweep: number,
  x2: number,
  y2: number,
): Segment[] {
  if (x1 === x2 && y1 === y2) return [];
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (rx === 0 || ry === 0) return [{ op: "L", x: x2, y: y2 }];
  const phi = (angle * Math.PI) / 180;
  const cos = Math.cos(phi);
  const sin = Math.sin(phi);
  const dx = (x1 - x2) / 2;
  const dy = (y1 - y2) / 2;
  const xp = cos * dx + sin * dy;
  const yp = -sin * dx + cos * dy;
  const lambda = (xp * xp) / (rx * rx) + (yp * yp) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }
  const num = rx * rx * ry * ry - rx * rx * yp * yp - ry * ry * xp * xp;
  const den = rx * rx * yp * yp + ry * ry * xp * xp;
  let coef = Math.sqrt(Math.max(0, num / den));
  if (largeArc === sweep) coef = -coef;
  const cxp = (coef * rx * yp) / ry;
  const cyp = (-coef * ry * xp) / rx;
  const cx = cos * cxp - sin * cyp + (x1 + x2) / 2;
  const cy = sin * cxp + cos * cyp + (y1 + y2) / 2;
  const vecAngle = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const theta1 = vecAngle(1, 0, (xp - cxp) / rx, (yp - cyp) / ry);
  let delta = vecAngle((xp - cxp) / rx, (yp - cyp) / ry, (-xp - cxp) / rx, (-yp - cyp) / ry);
  if (!sweep && delta > 0) delta -= 2 * Math.PI;
  if (sweep && delta < 0) delta += 2 * Math.PI;

  const parts = Math.ceil(Math.abs(delta) / (Math.PI / 2) - 1e-9);
  const step = delta / parts;
  const k = (4 / 3) * Math.tan(step / 4);
  const point = (t: number) => {
    const ex = rx * Math.cos(t);
    const ey = ry * Math.sin(t);
    return [cos * ex - sin * ey + cx, sin * ex + cos * ey + cy] as const;
  };
  const derivative = (t: number) => {
    const ex = -rx * Math.sin(t);
    const ey = ry * Math.cos(t);
    return [cos * ex - sin * ey, sin * ex + cos * ey] as const;
  };
  const segments: Segment[] = [];
  for (let i = 0; i < parts; i++) {
    const a = theta1 + i * step;
    const b = a + step;
    const [px, py] = point(a);
    const [qx, qy] = i === parts - 1 ? [x2, y2] : point(b);
    const [dax, day] = derivative(a);
    const [dbx, dby] = derivative(b);
    segments.push({
      op: "C",
      x1: px + k * dax,
      y1: py + k * day,
      x2: qx - k * dbx,
      y2: qy - k * dby,
      x: qx,
      y: qy,
    });
  }
  return segments;
}

/** Parses SVG path data into absolute move, line and cubic segments. */
export function parsePath(d: string): Segment[] {
  const out: Segment[] = [];
  let x = 0;
  let y = 0;
  let startX = 0;
  let startY = 0;
  // Reflection points for smooth curves (S/T).
  let lastCubic: [number, number] | null = null;
  let lastQuad: [number, number] | null = null;

  for (const { command, args } of tokenize(d)) {
    const rel = command === command.toLowerCase();
    const upper = command.toUpperCase();
    const ox = () => (rel ? x : 0);
    const oy = () => (rel ? y : 0);
    let i = 0;
    const take = (n: number) => {
      const slice = args.slice(i, i + n);
      i += n;
      return slice.length === n ? slice : null;
    };

    if (upper === "Z") {
      out.push({ op: "Z" });
      x = startX;
      y = startY;
      lastCubic = lastQuad = null;
      continue;
    }

    let first = true;
    while (i < args.length) {
      const before = i;
      let cubic: [number, number] | null = null;
      let quad: [number, number] | null = null;
      switch (upper) {
        case "M": {
          const p = take(2);
          if (!p) break;
          x = p[0]! + ox();
          y = p[1]! + oy();
          if (first) {
            out.push({ op: "M", x, y });
            startX = x;
            startY = y;
          } else out.push({ op: "L", x, y });
          break;
        }
        case "L": {
          const p = take(2);
          if (!p) break;
          x = p[0]! + ox();
          y = p[1]! + oy();
          out.push({ op: "L", x, y });
          break;
        }
        case "H": {
          const p = take(1);
          if (!p) break;
          x = p[0]! + ox();
          out.push({ op: "L", x, y });
          break;
        }
        case "V": {
          const p = take(1);
          if (!p) break;
          y = p[0]! + oy();
          out.push({ op: "L", x, y });
          break;
        }
        case "C": {
          const p = take(6);
          if (!p) break;
          const [bx, by] = [ox(), oy()];
          const seg = {
            op: "C" as const,
            x1: p[0]! + bx,
            y1: p[1]! + by,
            x2: p[2]! + bx,
            y2: p[3]! + by,
            x: p[4]! + bx,
            y: p[5]! + by,
          };
          out.push(seg);
          cubic = [seg.x2, seg.y2];
          x = seg.x;
          y = seg.y;
          break;
        }
        case "S": {
          const p = take(4);
          if (!p) break;
          const [bx, by] = [ox(), oy()];
          const [rx1, ry1]: [number, number] = lastCubic
            ? [2 * x - lastCubic[0], 2 * y - lastCubic[1]]
            : [x, y];
          const seg: Extract<Segment, { op: "C" }> = {
            op: "C" as const,
            x1: rx1,
            y1: ry1,
            x2: p[0]! + bx,
            y2: p[1]! + by,
            x: p[2]! + bx,
            y: p[3]! + by,
          };
          out.push(seg);
          cubic = [seg.x2, seg.y2];
          x = seg.x;
          y = seg.y;
          break;
        }
        case "Q":
        case "T": {
          const p = take(upper === "Q" ? 4 : 2);
          if (!p) break;
          const [bx, by] = [ox(), oy()];
          let qx: number;
          let qy: number;
          let ex: number;
          let ey: number;
          if (upper === "Q") {
            [qx, qy, ex, ey] = [p[0]! + bx, p[1]! + by, p[2]! + bx, p[3]! + by];
          } else {
            [qx, qy] = lastQuad ? [2 * x - lastQuad[0], 2 * y - lastQuad[1]] : [x, y];
            [ex, ey] = [p[0]! + bx, p[1]! + by];
          }
          out.push({
            op: "C",
            x1: x + (2 / 3) * (qx - x),
            y1: y + (2 / 3) * (qy - y),
            x2: ex + (2 / 3) * (qx - ex),
            y2: ey + (2 / 3) * (qy - ey),
            x: ex,
            y: ey,
          });
          quad = [qx, qy];
          x = ex;
          y = ey;
          break;
        }
        case "A": {
          const p = take(7);
          if (!p) break;
          const ex = p[5]! + ox();
          const ey = p[6]! + oy();
          out.push(...arcToCubics(x, y, p[0]!, p[1]!, p[2]!, p[3]!, p[4]!, ex, ey));
          x = ex;
          y = ey;
          break;
        }
      }
      // A malformed tail (too few numbers) ends the command instead of looping forever.
      if (i === before) break;
      lastCubic = cubic;
      lastQuad = quad;
      first = false;
    }
  }
  return out;
}

const KAPPA = 0.5522847498;

/** An ellipse as four cubic segments. */
export function ellipsePath(cx: number, cy: number, rx: number, ry: number): Segment[] {
  const kx = rx * KAPPA;
  const ky = ry * KAPPA;
  return [
    { op: "M", x: cx + rx, y: cy },
    { op: "C", x1: cx + rx, y1: cy + ky, x2: cx + kx, y2: cy + ry, x: cx, y: cy + ry },
    { op: "C", x1: cx - kx, y1: cy + ry, x2: cx - rx, y2: cy + ky, x: cx - rx, y: cy },
    { op: "C", x1: cx - rx, y1: cy - ky, x2: cx - kx, y2: cy - ry, x: cx, y: cy - ry },
    { op: "C", x1: cx + kx, y1: cy - ry, x2: cx + rx, y2: cy - ky, x: cx + rx, y: cy },
    { op: "Z" },
  ];
}

/** A rectangle, with rounded corners when rx/ry are set. */
export function rectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  rxIn = 0,
  ryIn = rxIn,
): Segment[] {
  const rx = Math.min(Math.max(0, rxIn), w / 2);
  const ry = Math.min(Math.max(0, ryIn), h / 2);
  if (!rx || !ry) {
    return [
      { op: "M", x, y },
      { op: "L", x: x + w, y },
      { op: "L", x: x + w, y: y + h },
      { op: "L", x, y: y + h },
      { op: "Z" },
    ];
  }
  const kx = rx * (1 - KAPPA);
  const ky = ry * (1 - KAPPA);
  return [
    { op: "M", x: x + rx, y },
    { op: "L", x: x + w - rx, y },
    { op: "C", x1: x + w - kx, y1: y, x2: x + w, y2: y + ky, x: x + w, y: y + ry },
    { op: "L", x: x + w, y: y + h - ry },
    { op: "C", x1: x + w, y1: y + h - ky, x2: x + w - kx, y2: y + h, x: x + w - rx, y: y + h },
    { op: "L", x: x + rx, y: y + h },
    { op: "C", x1: x + kx, y1: y + h, x2: x, y2: y + h - ky, x, y: y + h - ry },
    { op: "L", x, y: y + ry },
    { op: "C", x1: x, y1: y + ky, x2: x + kx, y2: y, x: x + rx, y },
    { op: "Z" },
  ];
}

export function transformSegments(segments: Segment[], m: Matrix): Segment[] {
  return segments.map((s) => {
    switch (s.op) {
      case "Z":
        return s;
      case "M":
      case "L": {
        const [x, y] = apply(m, s.x, s.y);
        return { op: s.op, x, y };
      }
      case "C": {
        const [x1, y1] = apply(m, s.x1, s.y1);
        const [x2, y2] = apply(m, s.x2, s.y2);
        const [x, y] = apply(m, s.x, s.y);
        return { op: "C", x1, y1, x2, y2, x, y };
      }
    }
  });
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

const NAMED: Record<string, Rgb> = {
  black: { r: 0, g: 0, b: 0 },
  white: { r: 255, g: 255, b: 255 },
};

/** Parses a solid color; returns null for "none", "transparent" or a fully transparent rgba(). */
export function parseColor(value: string | null | undefined): Rgb | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  if (v === "none" || v === "transparent") return null;
  if (NAMED[v]) return NAMED[v];
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v);
  if (hex) {
    const h = hex[1]!.length === 3 ? [...hex[1]!].map((c) => c + c).join("") : hex[1]!;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
    };
  }
  const rgb = /^rgba?\(([^)]*)\)$/.exec(v);
  if (rgb) {
    const [r = 0, g = 0, b = 0, a = 1] = numbers(rgb[1]!);
    if (a === 0) return null;
    return { r, g, b };
  }
  return null;
}
