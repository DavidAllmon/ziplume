import localFont from "next/font/local";

// Self-hosted fonts: no requests to third-party font servers at runtime or build time.

/** Body text, buttons and forms. */
export const plexSans = localFont({
  src: "../node_modules/@fontsource-variable/ibm-plex-sans/files/ibm-plex-sans-latin-wght-normal.woff2",
  variable: "--font-plex-sans",
  weight: "100 700",
  display: "swap",
});

/** Headings and the wordmark. Its width axis gives Ziplume's wide letters. */
export const archivo = localFont({
  src: "../node_modules/@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2",
  variable: "--font-archivo",
  weight: "100 900",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});

/** Short links, API keys and code. */
export const plexMono = localFont({
  src: [
    {
      path: "../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});
