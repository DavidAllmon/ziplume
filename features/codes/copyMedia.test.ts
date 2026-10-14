// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { copyMediaFiles } from "@/features/teams/media";
import { getAuthState } from "@/lib/auth/server";

import { copyCodeMedia } from "./copyMedia";

vi.mock("@/lib/auth/server", () => ({ getAuthState: vi.fn() }));
vi.mock("@/features/teams/media", () => ({ copyMediaFiles: vi.fn() }));

const KIM = "3a3a3a3a-3a3a-4a3a-8a3a-3a3a3a3a3a3a";
const ME = "3b3b3b3b-3b3b-4b3b-8b3b-3b3b3b3b3b3b";
const LOGO = { path: `${KIM}/a.png`, name: "a.png", type: "image/png", size: 1 };

function signIn(code: { user_id: string; content: unknown } | null) {
  vi.mocked(getAuthState).mockResolvedValue({
    supabase: {
      from: () => ({
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: code }) }) }),
      }),
    },
    user: { id: ME },
    needsMfa: false,
  } as never);
}

beforeEach(() => vi.mocked(copyMediaFiles).mockReset());

describe("copyCodeMedia", () => {
  it("copies a teammate's page files into your folder and points the copy at them", async () => {
    signIn({ user_id: KIM, content: { logo: LOGO } });
    vi.mocked(copyMediaFiles).mockResolvedValue({
      ok: true,
      renamed: { [`${KIM}/a.png`]: `${ME}/a.png` },
      missing: 0,
    });
    expect(await copyCodeMedia("c1")).toEqual({
      ok: true,
      content: { logo: { ...LOGO, path: `${ME}/a.png` } },
    });
    expect(copyMediaFiles).toHaveBeenCalledWith([`${KIM}/a.png`], KIM, ME);
  });

  it("leaves your own page as it is, and explains a failed copy", async () => {
    signIn({ user_id: ME, content: { logo: LOGO } });
    expect(await copyCodeMedia("c1")).toEqual({ ok: true, content: { logo: LOGO } });
    expect(copyMediaFiles).not.toHaveBeenCalled();
    signIn({ user_id: KIM, content: { logo: LOGO } });
    vi.mocked(copyMediaFiles).mockResolvedValue({ ok: false });
    expect(await copyCodeMedia("c1")).toEqual({
      ok: false,
      error: "Its images couldn’t be copied. Please try again.",
    });
  });

  it("can't copy what you can't see", async () => {
    signIn(null);
    expect(await copyCodeMedia("c1")).toEqual({ ok: false, error: "That code couldn’t be found." });
  });
});
