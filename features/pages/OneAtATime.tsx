"use client";

import { useEffect } from "react";

/** Starting one player pauses the others on the page (spec item 50). */
export function OneAtATime() {
  useEffect(() => {
    const onPlay = (event: Event) => {
      for (const el of document.querySelectorAll<HTMLMediaElement>("audio, video")) {
        if (el !== event.target) el.pause();
      }
    };
    // "play" doesn't bubble, so it's caught on the way down.
    document.addEventListener("play", onPlay, true);
    return () => document.removeEventListener("play", onPlay, true);
  }, []);
  return null;
}
