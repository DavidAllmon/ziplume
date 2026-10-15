import { afterEach, describe, expect, it, vi } from "vitest";

import nextConfig from "./next.config";

afterEach(() => vi.unstubAllEnvs());

const rewrites = async () =>
  (await nextConfig.rewrites!()) as { source: string; destination: string }[];

describe("the Supabase pass-through", () => {
  it("proxies Google sign-in and public files to the project", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.example/");
    expect(await rewrites()).toEqual([
      {
        source: "/auth/v1/authorize",
        destination: "https://project.supabase.example/auth/v1/authorize",
      },
      {
        source: "/auth/v1/callback",
        destination: "https://project.supabase.example/auth/v1/callback",
      },
      {
        source: "/storage/v1/object/public/:path*",
        destination: "https://project.supabase.example/storage/v1/object/public/:path*",
      },
    ]);
  });

  it("is off without a Supabase project", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    expect(await rewrites()).toEqual([]);
  });
});
