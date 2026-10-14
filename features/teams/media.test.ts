// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

import { copyPageMedia } from "./media";

const M = "3a3a3a3a-3a3a-4a3a-8a3a-3a3a3a3a3a3a";
const O = "3b3b3b3b-3b3b-4b3b-8b3b-3b3b3b3b3b3b";

vi.mock("server-only", () => ({}));

const copies: string[] = [];
const updates: unknown[] = [];
let copyErrors: Record<string, string> = {};
const pages = [
  {
    id: "p1",
    content: { logo: { path: `${M}/a.png`, name: "a.png", type: "image/png", size: 1 } },
  },
  {
    id: "p2",
    content: { file: { path: `${M}/b.pdf`, name: "b.pdf", type: "application/pdf", size: 2 } },
  },
  { id: "p3", content: { text: "no media" } },
];
vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ eq: async () => ({ data: pages, error: null }) }) }),
      update: (value: unknown) => {
        updates.push(value);
        return { eq: async () => ({ error: null }) };
      },
    }),
    storage: {
      from: () => ({
        copy: async (from: string, to: string) => {
          copies.push(`${from} -> ${to}`);
          return copyErrors[from] ? { error: { message: copyErrors[from] } } : { error: null };
        },
      }),
    },
  }),
}));

beforeEach(() => {
  copies.length = 0;
  updates.length = 0;
  copyErrors = {};
});

describe("copyPageMedia", () => {
  it("copies every file and rewrites no page itself", async () => {
    const result = await copyPageMedia(M, O);
    expect(copies).toEqual([`${M}/a.png -> ${O}/a.png`, `${M}/b.pdf -> ${O}/b.pdf`]);
    expect(updates).toEqual([]);
    expect(result).toMatchObject({
      ok: true,
      renamed: { [`${M}/a.png`]: `${O}/a.png`, [`${M}/b.pdf`]: `${O}/b.pdf` },
      files: 2,
      missing: 0,
    });
    expect(result.ok && result.pages.map((page) => page.id)).toEqual(["p1", "p2"]);
  });

  it("skips files that are already gone, and stops on any other error", async () => {
    copyErrors = { [`${M}/b.pdf`]: "Object not found" };
    expect(await copyPageMedia(M, O)).toMatchObject({ ok: true, files: 1, missing: 1 });
    copyErrors = { [`${M}/a.png`]: "boom" };
    expect((await copyPageMedia(M, O)).ok).toBe(false);
  });
});
