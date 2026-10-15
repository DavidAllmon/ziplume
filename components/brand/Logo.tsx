import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { BRAND, MARK, SMALL_MARK, TILE_MARK } from "./mark";

interface LogoMarkProps {
  className?: string;
  /** "plain" follows the theme (and the navy sidebar); "tile" is the app icon; "small" is for 24 px and under. */
  variant?: "plain" | "tile" | "small";
  /** Names the mark for screen readers; without it the mark is decoration. */
  title?: string;
}

const round = { fill: "none", strokeLinecap: "round" } as const;

/** The scan-beam mark: viewfinder corners around a Z whose diagonal is a beam of light. */
export function LogoMark({ className, variant = "plain", title }: LogoMarkProps) {
  const svg = (children: ReactNode) => (
    <svg
      viewBox="0 0 64 64"
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {children}
    </svg>
  );
  if (variant === "small") {
    return svg(
      <>
        <rect width={64} height={64} rx={14} fill={BRAND.navy} />
        <path d={SMALL_MARK.bars} stroke={BRAND.white} strokeWidth={8} {...round} />
        <path d={SMALL_MARK.beam} stroke={BRAND.scan} strokeWidth={8} {...round} />
      </>,
    );
  }
  if (variant === "tile") {
    return svg(
      <>
        <rect width={64} height={64} rx={14} fill={BRAND.navy} />
        <path d={TILE_MARK.corners} stroke={BRAND.tile.corners} strokeWidth={3.5} {...round} />
        <path d={TILE_MARK.bars} stroke={BRAND.tile.bars} strokeWidth={5} {...round} />
        <path d={TILE_MARK.beam} stroke={BRAND.tile.beam} strokeWidth={5} {...round} />
      </>,
    );
  }
  return svg(
    <>
      <path d={MARK.corners} stroke="var(--logo-corners)" strokeWidth={4} {...round} />
      <path d={MARK.bars} stroke="var(--logo-bars)" strokeWidth={5.5} {...round} />
      <path d={MARK.beam} stroke="var(--logo-glow)" strokeWidth={12} opacity={0.3} {...round} />
      <path d={MARK.beam} stroke="var(--logo-beam)" strokeWidth={5.5} {...round} />
    </>,
  );
}

const corner = "absolute size-[0.36em] border-[var(--logo-beam)]";

/** The text logo: "ZIPLUME" in wide capitals. `framed` adds viewfinder corners for big moments. */
export function Wordmark({ className, framed = false }: { className?: string; framed?: boolean }) {
  return (
    <span
      className={cn(
        "relative inline-block font-display leading-none font-bold tracking-[0.14em] text-fg uppercase",
        framed && "py-[0.3em] pr-[0.36em] pl-[0.5em]",
        className,
      )}
      style={{ fontVariationSettings: "'wdth' 125" }}
    >
      Ziplume
      {framed && (
        <>
          <span
            aria-hidden
            className={cn(corner, "top-0 left-0 border-t-[0.06em] border-l-[0.06em]")}
          />
          <span
            aria-hidden
            className={cn(corner, "top-0 right-0 border-t-[0.06em] border-r-[0.06em]")}
          />
          <span
            aria-hidden
            className={cn(corner, "bottom-0 left-0 border-b-[0.06em] border-l-[0.06em]")}
          />
          <span
            aria-hidden
            className={cn(corner, "right-0 bottom-0 border-r-[0.06em] border-b-[0.06em]")}
          />
        </>
      )}
    </span>
  );
}

/** The mark beside the text logo, for the public header. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-8" />
      <Wordmark className="text-[17px]" />
    </span>
  );
}
