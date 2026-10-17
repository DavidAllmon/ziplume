"use client";

import { Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";
import type { VideoEmbed } from "@/lib/pages/urls";

/** A video from a site with trackers, loaded only once it's tapped (spec item 45). */
export function TapToPlay({ embed, title }: { embed: VideoEmbed; title: string }) {
  const [on, setOn] = useState(false);
  const player = useRef<HTMLIFrameElement>(null);
  // The button that was tapped is gone, so focus moves to the player that replaced it.
  useEffect(() => {
    if (on) player.current?.focus();
  }, [on]);
  const shape = embed.vertical
    ? "mx-auto aspect-[9/16] w-full max-w-[22rem]"
    : "aspect-video w-full";
  if (on) {
    return (
      <iframe
        ref={player}
        src={embed.src}
        title={title}
        className={shape}
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
      className={cn(
        shape,
        "grid place-items-center bg-black text-white focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-white",
      )}
    >
      <span className="flex flex-col items-center gap-2 text-sm font-semibold">
        <Play aria-hidden className="size-12" />
        Tap to play from {embed.name}
      </span>
    </button>
  );
}
