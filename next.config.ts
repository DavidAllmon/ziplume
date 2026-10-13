import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A self-contained Node server for the Docker image Coolify runs.
  output: "standalone",
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
};

export default nextConfig;
