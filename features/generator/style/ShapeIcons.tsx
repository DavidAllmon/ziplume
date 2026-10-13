import type { CornerStyle, DotStyle } from "@/lib/qr/types";

// Small previews of each module and corner style, drawn on a 24×24 grid.
const CELLS = [
  [3, 3],
  [10, 3],
  [3, 10],
  [17, 10],
  [10, 17],
  [17, 17],
] as const;

export function DotStyleIcon({ style }: { style: DotStyle }) {
  return (
    <svg viewBox="0 0 24 24" className="size-7" aria-hidden fill="currentColor">
      {CELLS.map(([x, y]) => {
        switch (style) {
          case "square":
            return <rect key={`${x}${y}`} x={x} y={y} width={5} height={5} />;
          case "rounded":
            return <rect key={`${x}${y}`} x={x} y={y} width={5} height={5} rx={1.6} />;
          case "dots":
            return <circle key={`${x}${y}`} cx={x + 2.5} cy={y + 2.5} r={2.5} />;
          case "classy":
            return (
              <path
                key={`${x}${y}`}
                d={`M${x} ${y + 5}V${y + 2}a2 2 0 0 1 2-2h3v3a2 2 0 0 1-2 2Z`}
              />
            );
        }
      })}
    </svg>
  );
}

export function CornerStyleIcon({ style }: { style: CornerStyle }) {
  const ring = { square: 0, rounded: 3.5, dot: 9 }[style];
  const eye = { square: 0, rounded: 1.5, dot: 3 }[style];
  return (
    <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
      <rect
        x={4}
        y={4}
        width={16}
        height={16}
        rx={ring}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
      />
      <rect x={9} y={9} width={6} height={6} rx={eye} fill="currentColor" />
    </svg>
  );
}
