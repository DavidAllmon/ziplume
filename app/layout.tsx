import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { Providers } from "@/components/layout/Providers";
import { SITE_URL } from "@/lib/env";

import { archivo, plexMono, plexSans } from "./fonts";
import "./globals.css";

const title = "Ziplume: Make it. Link it. Share it.";
const description = "QR codes, short links, and simple sharing tools.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: title, template: "%s · Ziplume" },
  description,
  applicationName: "Ziplume",
  authors: [{ name: "David Allmon", url: "https://github.com/DavidAllmon" }],
  keywords: [
    "QR code generator",
    "Wi-Fi QR code",
    "vCard QR code",
    "free QR code",
    "custom QR code",
  ],
  openGraph: {
    title,
    description,
    siteName: "Ziplume",
    locale: "en_US",
    type: "website",
  },
  twitter: { card: "summary_large_image", title, description },
  appleWebApp: { title: "Ziplume", capable: true, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#070B1A" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    // next-themes sets data-theme before hydration, so the attribute differs from the server HTML.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plexSans.variable} ${archivo.variable} ${plexMono.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
