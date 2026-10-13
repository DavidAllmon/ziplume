import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { Providers } from "@/components/layout/Providers";

import { inter, spaceGrotesk } from "./fonts";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://davidallmon.github.io";
const title = "QuickQReate: free QR code generator";
const description =
  "Create beautiful, scannable QR codes for links, Wi-Fi, contacts, email, phone and SMS. Free, private and runs entirely in your browser.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: "QuickQReate",
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
    siteName: "QuickQReate",
    locale: "en_US",
    type: "website",
  },
  twitter: { card: "summary_large_image", title, description },
  appleWebApp: { title: "QuickQReate", capable: true, statusBarStyle: "default" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#0B1020" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    // next-themes sets data-theme before hydration, so the attribute differs from the server HTML.
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable}`}
    >
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
