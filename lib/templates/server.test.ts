// @vitest-environment node
import { describe, expect, it } from "vitest";

import { DEFAULT_DESIGN } from "@/features/generator/state/defaults";

import { defaultDesign } from "./server";

const supabase = (row: unknown) =>
  ({
    from: () => ({
      select: () => ({
        eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: row, error: null }) }) }),
      }),
    }),
  }) as never;

describe("defaultDesign", () => {
  it("is the person's default template, cleaned, or null without one", async () => {
    const design = await defaultDesign(
      supabase({ design: { fgColor: "#BE123C", frame: "nope" } }),
      "u1",
    );
    expect(design?.fgColor).toBe("#BE123C");
    // Anything unknown or missing falls back to Classic's.
    expect(design?.frame).toBe(DEFAULT_DESIGN.frame);
    expect(design?.dotStyle).toBe(DEFAULT_DESIGN.dotStyle);
    expect(await defaultDesign(supabase(null), "u1")).toBeNull();
  });
});
