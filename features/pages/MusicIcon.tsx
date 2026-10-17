import { Music } from "lucide-react";

import { MUSIC_ICONS } from "@/lib/pages/music-icons.data";
import { SOCIAL_ICONS } from "@/lib/pages/social-icons.data";
import type { ListenService } from "@/lib/pages/urls";

/** A music service's mark; Amazon Music has none in Simple Icons, so a note (ruling 4). */
export function MusicIcon({ service }: { service: ListenService["id"] }) {
  const mark =
    MUSIC_ICONS.find((icon) => icon.id === service) ??
    SOCIAL_ICONS.find((icon) => icon.id === service);
  if (!mark) return <Music aria-hidden className="size-5" />;
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="currentColor">
      <path d={mark.path} />
    </svg>
  );
}
