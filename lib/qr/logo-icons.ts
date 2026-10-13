import { LOGO_ICONS, type IconNode } from "./logo-icons.data";

export { LOGO_ICONS };
export type LogoIconId = (typeof LOGO_ICONS)[number]["id"];

const BY_ID = new Map<string, IconNode>(LOGO_ICONS.map((icon) => [icon.id, icon.nodes]));

export const isLogoIcon = (id: string): id is LogoIconId => BY_ID.has(id);

const escapeAttr = (value: string | number) =>
  String(value).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );

/** The icon's shapes as SVG markup on its 24×24 grid. */
export function iconMarkup(id: string): string {
  const nodes = BY_ID.get(id) ?? [];
  return nodes
    .map(([tag, attrs]) => {
      const list = Object.entries(attrs)
        .map(([key, value]) => `${key}="${escapeAttr(value)}"`)
        .join(" ");
      return `<${tag} ${list}/>`;
    })
    .join("");
}

/**
 * A preset logo: the icon in `color` on a rounded `background` tile, as an SVG data URL
 * that the renderer can place like an uploaded logo.
 */
export function logoIconDataUrl(id: string, color: string, background: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 48 48">` +
    `<rect width="48" height="48" rx="12" fill="${escapeAttr(background)}"/>` +
    `<g transform="translate(6 6) scale(1.5)" fill="none" stroke="${escapeAttr(color)}" ` +
    `stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${iconMarkup(id)}</g></svg>`;
  return `data:image/svg+xml;base64,${toBase64(svg)}`;
}

function toBase64(text: string): string {
  let binary = "";
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}
