import type { NextConfig } from "next";

// GitHub Pages serves the site from /<repo>, so CI sets NEXT_PUBLIC_BASE_PATH=/QuickQReate.
// Locally it is empty and the app is served from the root.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
