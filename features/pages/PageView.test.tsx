import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PAGE_DEFAULTS } from "@/lib/pages/types";

import { PageView } from "./PageView";

const media = (path: string, type: string) => ({
  path: `00000000-0000-0000-0000-000000000000/${path}`,
  name: path,
  type,
  size: 1000,
});

const view = (type: Parameters<typeof PageView>[0]["type"], content: object, preview = true) =>
  render(
    <PageView
      type={type}
      content={content as never}
      slug="PREVIEW"
      pageUrl="https://ziplume.com/p/PREVIEW"
      preview={preview}
    />,
  );

describe("PageView", () => {
  it("sizes itself from its own width, not the screen's", () => {
    const { container } = view("links", { ...PAGE_DEFAULTS.links(), title: "Hi" }, false);
    expect(container.firstElementChild).toHaveClass("@container");
  });

  it("keeps menu section chips from navigating in the preview", () => {
    const menu = {
      ...PAGE_DEFAULTS.menu(),
      name: "Diner",
      sections: [
        { name: "Starters", items: [{ name: "Soup", description: "", price: "5", tags: "" }] },
        { name: "Mains", items: [{ name: "Pie", description: "", price: "9", tags: "" }] },
      ],
    };
    const { container, unmount } = view("menu", menu);
    expect(container.querySelector('a[href^="#section-"]')).toBeNull();
    unmount();
    // The live page keeps them as links.
    const live = view("menu", menu, false);
    expect(live.container.querySelector('a[href="#section-1"]')).not.toBeNull();
  });

  it("doesn't play video or audio in the preview", () => {
    const video = { ...PAGE_DEFAULTS.video(), title: "Clip", url: "https://youtu.be/dQw4w9WgXcQ" };
    const { container, getAllByText, unmount } = view("video", video);
    expect(container.querySelector("iframe, video")).toBeNull();
    expect(getAllByText("Plays on the live page").length).toBeGreaterThan(0);
    unmount();

    const audio = { ...PAGE_DEFAULTS.audio(), title: "Tune", file: media("a.mp3", "audio/mpeg") };
    const second = view("audio", audio);
    expect(second.container.querySelector("audio")).toBeNull();
    expect(second.getAllByText("Plays on the live page").length).toBeGreaterThan(0);
    second.unmount();

    // The live page still plays them.
    expect(view("video", video, false).container.querySelector("iframe")).not.toBeNull();
  });
});
