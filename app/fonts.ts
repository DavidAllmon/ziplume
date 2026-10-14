import localFont from "next/font/local";

// Self-hosted variable font: no requests to third-party font servers at runtime or build time.
export const inter = localFont({
  src: "../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});
