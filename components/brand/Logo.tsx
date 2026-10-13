import { cn } from "@/lib/cn";

import { BRAND, EYE, RING_PATH, TAIL_PATH } from "./mark";

/*
 * The "Q-eye" mark: a QR finder pattern whose ring opens at the bottom right,
 * where a lime tail breaks out to form a Q.
 */

interface LogoMarkProps {
  className?: string;
  /** Draws the mark in white on an indigo tile (used for app icons). */
  tile?: boolean;
  title?: string;
}

export function LogoMark({ className, tile = false, title }: LogoMarkProps) {
  const ink = tile ? "#FFFFFF" : `var(--logo-ring, ${BRAND.indigo})`;
  const mark = (
    <>
      <path d={RING_PATH} fill={ink} />
      <rect x={EYE.x} y={EYE.y} width={EYE.size} height={EYE.size} rx={EYE.radius} fill={ink} />
      <path d={TAIL_PATH} stroke={BRAND.lime} strokeWidth={8} strokeLinecap="round" />
    </>
  );
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {tile ? (
        <>
          <rect width={64} height={64} rx={16} fill={BRAND.indigo} />
          <g transform="translate(9 9) scale(0.72)">{mark}</g>
        </>
      ) : (
        mark
      )}
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="size-8" />
      <span className="font-display text-xl font-bold tracking-tight text-fg">
        Quick<span className="text-primary dark:text-link">QR</span>eate
      </span>
    </span>
  );
}
