import type { CornerDotStyle, CornerStyle, DotStyle, FrameStyle } from "@/lib/qr/types";

// Small previews of each module, corner and frame style, drawn on a 24×24 grid.
const CELLS = [
  [3, 3],
  [10, 3],
  [3, 10],
  [17, 10],
  [10, 17],
  [17, 17],
] as const;

function cell(style: DotStyle, x: number, y: number) {
  const key = `${x}${y}`;
  switch (style) {
    case "square":
      return <rect key={key} x={x} y={y} width={5} height={5} />;
    case "rounded":
      return <rect key={key} x={x} y={y} width={5} height={5} rx={1.6} />;
    case "fluid":
      return <rect key={key} x={x} y={y} width={5} height={5} rx={2.2} />;
    case "dots":
      return <circle key={key} cx={x + 2.5} cy={y + 2.5} r={2.5} />;
    case "classy":
      return <path key={key} d={`M${x} ${y + 5}V${y + 2}a2 2 0 0 1 2-2h3v3a2 2 0 0 1-2 2Z`} />;
    case "leaf":
      return <path key={key} d={`M${x} ${y + 5}V${y}h3l2 2v3h-3Z`} />;
  }
}

export function DotStyleIcon({ style }: { style: DotStyle }) {
  return (
    <svg viewBox="0 0 24 24" className="size-7" aria-hidden fill="currentColor">
      {CELLS.map(([x, y]) => cell(style, x, y))}
    </svg>
  );
}

export function CornerStyleIcon({ style }: { style: CornerStyle }) {
  if (style === "leaf") {
    return (
      <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
        <path
          d="M4 20V7l3-3h13v13l-3 3Z"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        <path d="M9 15v-4.5L10.5 9H15v4.5L13.5 15Z" fill="currentColor" />
      </svg>
    );
  }
  if (style === "classy") {
    return (
      <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
        <path
          d="M4 20V9a5 5 0 0 1 5-5h11v11a5 5 0 0 1-5 5Z"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
        />
        <path d="M9 15v-4a2 2 0 0 1 2-2h4v4a2 2 0 0 1-2 2Z" fill="currentColor" />
      </svg>
    );
  }
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

export function CornerDotIcon({ style }: { style: CornerDotStyle }) {
  return (
    <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
      <rect
        x={4}
        y={4}
        width={16}
        height={16}
        rx={3.5}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.35}
        strokeWidth={2}
      />
      {style === "auto" ? (
        <text x={12} y={15.5} textAnchor="middle" fontSize={9} fontWeight={700} fill="currentColor">
          A
        </text>
      ) : style === "classy" ? (
        <path d="M8 16v-5a3 3 0 0 1 3-3h5v5a3 3 0 0 1-3 3Z" fill="currentColor" />
      ) : (
        <rect
          x={8}
          y={8}
          width={8}
          height={8}
          rx={{ square: 0, rounded: 2, dot: 4 }[style]}
          fill="currentColor"
        />
      )}
    </svg>
  );
}

export function FrameIcon({ style }: { style: FrameStyle }) {
  const code = (y: number) => (
    <g fill="currentColor">
      <rect x={8} y={y} width={3} height={3} />
      <rect x={13} y={y} width={3} height={3} />
      <rect x={8} y={y + 5} width={3} height={3} />
      <rect x={13.5} y={y + 5.5} width={2} height={2} />
    </g>
  );
  switch (style) {
    case "none":
      return (
        <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
          {code(8)}
        </svg>
      );
    case "bottom":
      return (
        <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
          <rect x={4} y={2} width={16} height={20} rx={2.5} fill="currentColor" opacity={0.25} />
          <rect x={5.5} y={3.5} width={13} height={13} rx={1.5} fill="var(--surface)" />
          {code(6)}
          <rect x={7} y={18.4} width={10} height={1.6} rx={0.8} fill="currentColor" />
        </svg>
      );
    case "top":
      return (
        <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
          <rect x={4} y={2} width={16} height={20} rx={2.5} fill="currentColor" opacity={0.25} />
          <rect x={5.5} y={7.5} width={13} height={13} rx={1.5} fill="var(--surface)" />
          {code(10)}
          <rect x={7} y={4} width={10} height={1.6} rx={0.8} fill="currentColor" />
        </svg>
      );
    case "badge":
      return (
        <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
          {code(4)}
          <rect x={5} y={16} width={14} height={5} rx={2.5} fill="currentColor" />
        </svg>
      );
    case "bubble":
      return (
        <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
          <rect
            x={5}
            y={2}
            width={14}
            height={13}
            rx={2}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
          />
          {code(4.5)}
          <path d="M10.5 18 12 16.3 13.5 18Z" fill="currentColor" />
          <rect x={5} y={17.5} width={14} height={4.5} rx={1.5} fill="currentColor" />
        </svg>
      );
  }
}
