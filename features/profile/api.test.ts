import { describe, expect, it, vi } from "vitest";

import { SITE_URL } from "@/lib/env";

import { uploadAvatar } from "./api";

const saved = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/client", () => ({
  getBrowserSupabase: () => ({
    storage: {
      from: () => ({
        upload: async () => ({ error: null }),
        list: async () => ({ data: [] }),
        remove: async () => ({ error: null }),
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://project.example/storage/v1/object/public/avatars/${path}` },
        }),
      }),
    },
    from: () => ({
      update: (row: unknown) => ({ eq: async () => (saved(row), { error: null }) }),
    }),
  }),
}));
vi.mock("./avatarImage", () => ({
  validateAvatarFile: () => null,
  prepareAvatar: async () => ({ blob: new Blob(["x"]), type: "image/webp" }),
}));

describe("uploaded profile photos", () => {
  it("are saved with the site's own address", async () => {
    const result = await uploadAvatar("u1", new File(["x"], "me.png", { type: "image/png" }));
    if (!result.ok) throw new Error(result.error);
    expect(result.url?.startsWith(`${SITE_URL}/storage/v1/object/public/avatars/u1/`)).toBe(true);
    expect(saved).toHaveBeenCalledWith({ avatar_url: result.url });
  });
});
