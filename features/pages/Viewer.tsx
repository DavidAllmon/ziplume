"use client";

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/cn";
import type { Media } from "@/lib/pages/types";

import { MediaImage } from "./parts";

export interface ViewerImage {
  media: Media;
  alt: string;
  caption?: string;
  /** An "Open link" button in the viewer (spec item 44). */
  link?: string | null;
}

// A sideways move shorter than this is a tap, not a swipe.
const SWIPE = 50;
const control =
  "grid size-11 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white aria-disabled:opacity-30";

/** Full-screen photos: swipe or arrow keys to move, Escape to close (spec item 18). */
export function Viewer({
  images,
  index,
  onIndex,
  onClose,
}: {
  images: ViewerImage[];
  index: number | null;
  onIndex: (index: number) => void;
  onClose: () => void;
}) {
  const start = useRef<number | null>(null);
  const open = index !== null && images[index] !== undefined;
  const at = index ?? 0;
  const image = images[at];
  const many = images.length > 1;
  const go = (to: number) => {
    if (to >= 0 && to < images.length) onIndex(to);
  };
  // On the document, so the arrows work wherever focus sits while it's open (even before it
  // lands inside the panel).
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" && at < images.length - 1) onIndex(at + 1);
      if (event.key === "ArrowLeft" && at > 0) onIndex(at - 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, at, images.length, onIndex]);
  return (
    // The dialog itself covers the screen (not just its fixed children), so it has a size.
    <Dialog open={open} onClose={onClose} className="fixed inset-0 z-50">
      <div className="fixed inset-0 bg-black/95" aria-hidden />
      <DialogPanel className="fixed inset-0 flex flex-col text-white">
        <div className="flex items-center justify-between gap-3 px-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
          {/* Read out again as the photo changes. */}
          <DialogTitle aria-live="polite" className="text-sm font-medium tabular-nums">
            Photo {at + 1} of {images.length}
          </DialogTitle>
          <button type="button" aria-label="Close" onClick={onClose} className={control}>
            <X aria-hidden className="size-5" />
          </button>
        </div>
        <div
          data-testid="viewer-stage"
          className="flex min-h-0 flex-1 touch-pan-y items-center justify-center px-2 py-3"
          onPointerDown={(event) => (start.current = event.clientX)}
          onPointerUp={(event) => {
            if (start.current === null) return;
            const moved = event.clientX - start.current;
            start.current = null;
            if (moved <= -SWIPE) go(at + 1);
            if (moved >= SWIPE) go(at - 1);
          }}
        >
          {image && (
            <MediaImage
              media={image.media}
              alt={image.alt}
              eager
              className="max-h-full max-w-full object-contain select-none"
            />
          )}
        </div>
        <div className="flex items-center gap-3 px-3 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          {many && (
            <button
              type="button"
              aria-label="Previous photo"
              // aria-disabled, not disabled: a disabled button drops focus out of the viewer.
              aria-disabled={at === 0}
              onClick={() => go(at - 1)}
              className={control}
            >
              <ChevronLeft aria-hidden className="size-6" />
            </button>
          )}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
            {image?.caption && <p className="text-sm text-white/90">{image.caption}</p>}
            {image?.link && (
              <a
                href={image.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <ExternalLink aria-hidden className="size-4" /> Open link
              </a>
            )}
          </div>
          {many && (
            <button
              type="button"
              aria-label="Next photo"
              aria-disabled={at === images.length - 1}
              onClick={() => go(at + 1)}
              className={control}
            >
              <ChevronRight aria-hidden className="size-6" />
            </button>
          )}
        </div>
      </DialogPanel>
    </Dialog>
  );
}

/** A row of photos to swipe through; tapping one opens the viewer. Inert in the preview. */
export function Gallery({
  images,
  label,
  preview = false,
  portrait = false,
}: {
  images: ViewerImage[];
  label: string;
  preview?: boolean;
  /** Tall, phone-shaped images (an app's screenshots). */
  portrait?: boolean;
}) {
  const [index, setIndex] = useState<number | null>(null);
  if (!images.length) return null;
  return (
    <>
      <ul
        aria-label={label}
        className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1"
      >
        {images.map((image, i) => (
          <li
            key={image.media.path}
            className={cn(
              "shrink-0 snap-start",
              portrait ? "w-[45%] max-w-48" : "w-[70%] max-w-64",
            )}
          >
            {preview ? (
              <MediaImage
                media={image.media}
                alt={image.alt}
                className={cn(
                  "w-full rounded-(--pg-radius) object-cover",
                  portrait ? "aspect-[9/16]" : "aspect-[4/3]",
                )}
              />
            ) : (
              <button
                type="button"
                aria-label={`Open photo ${i + 1} of ${images.length}`}
                onClick={() => setIndex(i)}
                className="block w-full overflow-hidden rounded-(--pg-radius) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring)"
              >
                <MediaImage
                  media={image.media}
                  alt=""
                  className={cn("w-full object-cover", portrait ? "aspect-[9/16]" : "aspect-[4/3]")}
                />
              </button>
            )}
          </li>
        ))}
      </ul>
      {!preview && (
        <Viewer images={images} index={index} onIndex={setIndex} onClose={() => setIndex(null)} />
      )}
    </>
  );
}

const OpenPhoto = createContext<((index: number) => void) | null>(null);

/** One viewer for photos spread across a page (a menu's dishes); each ViewerThumb opens it. */
export function ViewerGroup({ images, children }: { images: ViewerImage[]; children: ReactNode }) {
  const [index, setIndex] = useState<number | null>(null);
  return (
    <OpenPhoto.Provider value={setIndex}>
      {children}
      <Viewer images={images} index={index} onIndex={setIndex} onClose={() => setIndex(null)} />
    </OpenPhoto.Provider>
  );
}

/** A photo that opens its group's viewer; outside a group (the editor's preview) it's still. */
export function ViewerThumb({
  index,
  label,
  className,
  children,
}: {
  index: number;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const open = useContext(OpenPhoto);
  if (!open) return <span className={className}>{children}</span>;
  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => open(index)}
      className={cn(
        className,
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring)",
      )}
    >
      {children}
    </button>
  );
}
