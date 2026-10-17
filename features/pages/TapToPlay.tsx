"use client";

import { Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * A player from a site with trackers (TikTok, Spotify…), loaded only once it's tapped (spec items
 * 45 and 48). `frame` sizes a video by its shape; `height` is a music player's own height.
 */
export function TapToPlay({
  src,
  name,
  title,
  frame = "aspect-video w-full",
  height,
}: {
  src: string;
  /** For "Tap to play from TikTok". */
  name: string;
  title: string;
  frame?: string;
  height?: number;
}) {
  const [on, setOn] = useState(false);
  const player = useRef<HTMLIFrameElement>(null);
  // The button that was tapped is gone, so focus moves to the player that replaced it.
  useEffect(() => {
    if (on) player.current?.focus();
  }, [on]);
  const shape = height ? "w-full" : frame;
  const style = height ? { height } : undefined;
  if (on) {
    return (
      <iframe
        ref={player}
        src={src}
        title={title}
        className={shape}
        style={style}
        height={height}
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setOn(true)}
      style={style}
      className={cn(
        shape,
        "grid place-items-center bg-black text-white focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white",
      )}
    >
      <span className="flex flex-col items-center gap-2 text-sm font-semibold">
        <Play aria-hidden className={height && height < 200 ? "size-8" : "size-12"} />
        Tap to play from {name}
      </span>
    </button>
  );
}
