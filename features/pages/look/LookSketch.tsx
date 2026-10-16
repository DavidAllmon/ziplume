import type { CSSProperties } from "react";

import { cn } from "@/lib/cn";
import type { PageLook } from "@/lib/pages/look";

import { resolveLook } from "./resolve";

/** A tiny page drawn from a look: its wallpaper, header, two lines of text and three buttons. */
export function LookSketch({
  look,
  header = "classic",
  className,
}: {
  look: PageLook;
  header?: "classic" | "hero" | "banner" | "none";
  className?: string;
}) {
  const r = resolveLook(look);
  const style = { ...r.vars, background: r.background } as CSSProperties;
  return (
    <span
      aria-hidden
      data-sketch={look.theme}
      style={style}
      className={cn("flex flex-col items-center gap-1 overflow-hidden rounded-lg p-2", className)}
    >
      {header === "classic" && (
        <span className="size-4 shrink-0 rounded-full bg-(--fg) opacity-70" />
      )}
      {(header === "hero" || header === "banner") && (
        <span className="-mx-2 -mt-2 h-5 w-[calc(100%+1rem)] shrink-0 bg-(--fg) opacity-25" />
      )}
      <span className="h-1 w-1/2 shrink-0 rounded-full bg-(--fg)" />
      <span className="h-1 w-1/3 shrink-0 rounded-full bg-(--fg-muted)" />
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2.5 w-full shrink-0 rounded-(--pg-btn-radius) border border-(--pg-btn-border) bg-(--pg-btn-bg) shadow-(--pg-btn-shadow)"
        />
      ))}
    </span>
  );
}
