import { code128Widths, qrModules } from "@/lib/pages/scan";

// Always black on white, whatever the page's theme: scanners need dark bars on light (ruling 7).
const panel = "mx-auto rounded-xl bg-white p-3";
const QUIET = 10;

/** Where each bar starts, and its width, after the quiet zone: widths alternate bar, space. */
function barsOf(widths: number[]): { x: number; w: number }[] {
  const out: { x: number; w: number }[] = [];
  let x = QUIET;
  widths.forEach((w, i) => {
    if (i % 2 === 0) out.push({ x, w });
    x += w;
  });
  return out;
}

/** The coupon code as a QR code or a Code 128 barcode, for the till's scanner (spec item 26). */
export function ScanCode({ kind, value }: { kind: "qr" | "barcode"; value: string }) {
  if (kind === "qr") {
    const modules = qrModules(value);
    const n = modules.length;
    const d = modules
      .flatMap((row, r) => row.map((dark, c) => (dark ? `M${c} ${r}h1v1h-1z` : "")))
      .join("");
    return (
      <div className={panel}>
        <svg
          role="img"
          aria-label={`QR code for ${value}`}
          viewBox={`-2 -2 ${n + 4} ${n + 4}`}
          shapeRendering="crispEdges"
          className="size-48"
        >
          <rect x={-2} y={-2} width={n + 4} height={n + 4} fill="#fff" />
          <path d={d} fill="#000" />
        </svg>
      </div>
    );
  }
  const widths = code128Widths(value);
  if (!widths) return null;
  const total = widths.reduce((sum, w) => sum + w, 0) + QUIET * 2;
  return (
    <div className={`${panel} w-full max-w-sm`}>
      <svg
        role="img"
        aria-label={`Barcode for ${value}`}
        viewBox={`0 0 ${total} 60`}
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        className="h-24 w-full"
      >
        <rect width={total} height={60} fill="#fff" />
        {barsOf(widths).map(({ x, w }) => (
          <rect data-bar key={x} x={x} y={0} width={w} height={60} fill="#000" />
        ))}
      </svg>
    </div>
  );
}
