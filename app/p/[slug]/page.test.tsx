import { describe, expect, it, vi } from "vitest";

import { getPublicPage } from "@/lib/supabase/public";

import { themeLook } from "@/lib/pages/look";
import { sanitizePage } from "@/lib/pages/sanitize";

import { generateMetadata, generateViewport } from "./page";

vi.mock("@/lib/supabase/public", () => ({ getPublicPage: vi.fn() }));
vi.mock("@/features/pages/PageView", () => ({ PageView: () => null }));

const titleFor = async (slug: string) =>
  (await generateMetadata({ params: Promise.resolve({ slug }) } as never)).title;

describe("hosted page titles", () => {
  it("are the page's own title, without the site's suffix", async () => {
    vi.mocked(getPublicPage).mockResolvedValue({
      type: "links",
      content: { title: "Dave's Diner" },
      locked: false,
    } as never);
    expect(await titleFor("DINER1")).toEqual({ absolute: "Dave's Diner" });
  });

  it("say just Ziplume when the page can't be shown", async () => {
    vi.mocked(getPublicPage).mockResolvedValue(null);
    expect(await titleFor("NOPE12")).toEqual({ absolute: "Ziplume" });
    vi.mocked(getPublicPage).mockResolvedValue({
      type: "links",
      content: {},
      locked: true,
    } as never);
    expect(await titleFor("LOCK12")).toEqual({ absolute: "Ziplume" });
  });

  it("color the browser by the page's wallpaper, with its description", async () => {
    vi.mocked(getPublicPage).mockResolvedValue({
      type: "links",
      content: sanitizePage("links", {
        title: "Diner",
        bio: "Breakfast all day",
        look: themeLook("midnight", "links"),
      }),
      locked: false,
    } as never);
    const params = { params: Promise.resolve({ slug: "DINER1" }) } as never;
    expect(await generateViewport(params)).toMatchObject({
      themeColor: "#070B1A",
      colorScheme: "dark",
    });
    const meta = await generateMetadata(params);
    expect(meta.description).toBe("Breakfast all day");
    // X reads its own tags: without these it would show the site's title.
    expect(meta.twitter).toMatchObject({ title: "Diner", description: "Breakfast all day" });
  });
});
