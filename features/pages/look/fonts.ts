import type { FontId } from "@/lib/pages/look";

const sans = "ui-sans-serif, system-ui, sans-serif";
const serif = "ui-serif, Georgia, serif";
const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";
const plex = `var(--font-plex-sans), ${sans}`;

/** Spec 6.3: the family for the title, headings and buttons, and its reading partner. */
export const FONTS: Record<
  FontId,
  { label: string; heading: string; body: string; headingSettings: string }
> = {
  clean: { label: "Clean", heading: plex, body: plex, headingSettings: "normal" },
  bold: {
    label: "Bold",
    heading: `var(--font-archivo), ${sans}`,
    body: plex,
    headingSettings: '"wdth" 125',
  },
  elegant: {
    label: "Elegant",
    heading: `var(--font-playfair), ${serif}`,
    body: plex,
    headingSettings: "normal",
  },
  friendly: {
    label: "Friendly",
    heading: `var(--font-nunito), ${sans}`,
    body: `var(--font-nunito), ${sans}`,
    headingSettings: "normal",
  },
  modern: {
    label: "Modern",
    heading: `var(--font-bricolage), ${sans}`,
    body: plex,
    headingSettings: "normal",
  },
  typewriter: {
    label: "Typewriter",
    heading: `var(--font-plex-mono), ${mono}`,
    body: `var(--font-plex-mono), ${mono}`,
    headingSettings: "normal",
  },
};
