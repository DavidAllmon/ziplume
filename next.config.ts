import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A self-contained Node server for the Docker image Coolify runs.
  output: "standalone",
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  // The app moved in the 2026 redesign; old bookmarks and email links keep working (308s keep
  // the query string, e.g. ?workspace=).
  async redirects() {
    return [
      { source: "/dashboard", destination: "/codes", permanent: true },
      { source: "/dashboard/team", destination: "/team", permanent: true },
      { source: "/dashboard/codes/:id", destination: "/codes/:id", permanent: true },
      { source: "/dashboard/codes/:id/:rest*", destination: "/codes/:id/:rest*", permanent: true },
      { source: "/account", destination: "/settings", permanent: true },
    ];
  },
  // Google sign-in and public files go through the site's own address, so people only ever see
  // it (spec 5.1). Uploads, the database API and realtime still talk to Supabase directly.
  async rewrites() {
    const supabase = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
    if (!supabase) return [];
    return ["/auth/v1/authorize", "/auth/v1/callback", "/storage/v1/object/public/:path*"].map(
      (source) => ({ source, destination: `${supabase}${source}` }),
    );
  },
};

export default nextConfig;
