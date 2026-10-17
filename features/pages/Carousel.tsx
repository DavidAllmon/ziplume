"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";

import { cn } from "@/lib/cn";
import type { Media } from "@/lib/pages/types";

import { MediaImage } from "./parts";
import { ViewerThumb } from "./Viewer";

// Up to this many, dots; more won't fit a phone as 44px targets, so a counter instead (ruling 3).
const MAX_DOTS = 6;
const step =
  "grid size-11 place-items-center rounded-full text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring) aria-disabled:opacity-30";

/** A row of images to swipe through, one at a time (spec item 42). */
export function Carousel({
  items,
  preview = false,
}: {
  items: { media: Media; alt: string; caption?: string }[];
  preview?: boolean;
}) {
  const track = useRef<HTMLUListElement>(null);
  const [at, setAt] = useState(0);
  const go = (to: number) => {
    const slide = track.current?.children[to] as HTMLElement | undefined;
    if (!slide) return;
    slide.scrollIntoView?.({ behavior: "smooth", inline: "start", block: "nearest" });
    setAt(to);
  };
  return (
    <div data-layout="carousel" className="flex flex-col gap-2">
      <ul
        ref={track}
        aria-label="Images"
        onScroll={(event) => {
          const el = event.currentTarget;
          if (el.clientWidth) setAt(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto rounded-(--pg-radius)"
      >
        {items.map((item, i) => (
          <li key={item.media.path} className="w-full shrink-0 snap-start">
            <ViewerThumb index={i} label={item.alt} className="block w-full bg-surface-2">
              <MediaImage
                media={item.media}
                alt={preview ? item.alt : ""}
                eager={i === 0}
                className="aspect-[4/3] w-full object-cover"
              />
            </ViewerThumb>
          </li>
        ))}
      </ul>
      {/* The showing image's caption, under the row rather than on every slide, so it's never
          drawn off screen. */}
      {items[at]?.caption && <p className="text-sm text-fg-muted">{items[at]!.caption}</p>}
      {items.length > 1 &&
        !preview &&
        (items.length <= MAX_DOTS ? (
          <div className="flex justify-center" role="group" aria-label="Choose an image">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to image ${i + 1} of ${items.length}`}
                aria-current={i === at ? "true" : undefined}
                onClick={() => go(i)}
                className="grid size-11 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-(--ring)"
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-2.5 rounded-full",
                    i === at ? "bg-(--page-accent)" : "bg-fg-muted/40",
                  )}
                />
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              aria-label="Previous image"
              aria-disabled={at === 0}
              onClick={() => at > 0 && go(at - 1)}
              className={step}
            >
              <ChevronLeft aria-hidden className="size-5" />
            </button>
            <p
              aria-live="polite"
              className="min-w-16 text-center text-sm font-medium text-fg tabular-nums"
            >
              {at + 1} of {items.length}
            </p>
            <button
              type="button"
              aria-label="Next image"
              aria-disabled={at === items.length - 1}
              onClick={() => at < items.length - 1 && go(at + 1)}
              className={step}
            >
              <ChevronRight aria-hidden className="size-5" />
            </button>
          </div>
        ))}
    </div>
  );
}
