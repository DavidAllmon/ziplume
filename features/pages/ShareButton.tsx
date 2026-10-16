"use client";

import { Check, Share2 } from "lucide-react";
import { useRef, useState } from "react";

const BUTTON =
  "absolute top-3 right-3 z-10 grid size-11 place-items-center rounded-full border border-border bg-surface text-fg shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ring)";

/** Share this page: the phone's share sheet, or copy the link (spec item 55). */
export function ShareButton({ preview = false }: { preview?: boolean }) {
  const [note, setNote] = useState("");
  const timer = useRef<number | undefined>(undefined);
  if (preview) {
    return (
      <span aria-hidden className={BUTTON}>
        <Share2 className="size-5" />
      </span>
    );
  }
  const say = (text: string) => {
    setNote(text);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNote(""), 2500);
  };
  async function share() {
    const url = window.location.href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: document.title, url });
        return;
      } catch (error) {
        // Closing the sheet isn't a failure; anything else falls back to copying.
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      say("Link copied");
    } catch {
      say("Copy the link from the address bar");
    }
  }
  return (
    <>
      <button
        type="button"
        aria-label="Share this page"
        onClick={() => void share()}
        className={BUTTON}
      >
        {note === "Link copied" ? (
          <Check aria-hidden className="size-5" />
        ) : (
          <Share2 aria-hidden className="size-5" />
        )}
      </button>
      <p
        role="status"
        className={
          note
            ? "absolute top-16 right-3 z-10 rounded-full bg-fg px-3 py-1.5 text-sm text-bg"
            : "sr-only"
        }
      >
        {note}
      </p>
    </>
  );
}
