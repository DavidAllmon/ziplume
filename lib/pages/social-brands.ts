import { contrastRatio } from "@/lib/color/contrast";

import type { SocialNetwork } from "./types";

/** Each network's brand color (Simple Icons). LinkedIn's too; Website has none. */
export const BRAND_COLORS: Partial<Record<SocialNetwork, string>> = {
  instagram: "#FF0069",
  facebook: "#0866FF",
  x: "#000000",
  tiktok: "#000000",
  youtube: "#FF0000",
  github: "#181717",
  threads: "#000000",
  pinterest: "#BD081C",
  snapchat: "#FFFC00",
  whatsapp: "#25D366",
  telegram: "#26A5E4",
  discord: "#5865F2",
  twitch: "#9146FF",
  spotify: "#1ED760",
  soundcloud: "#FF5500",
  reddit: "#FF4500",
  mastodon: "#6364FF",
  bluesky: "#0285FF",
  linkedin: "#0A66C2",
};

/** White or black, whichever reads better on a brand color. */
export const brandGlyph = (color: string): "#FFFFFF" | "#000000" =>
  contrastRatio("#FFFFFF", color) >= contrastRatio("#000000", color) ? "#FFFFFF" : "#000000";
