import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { themeLook } from "@/lib/pages/look";
import { PAGE_DEFAULTS } from "@/lib/pages/types";
import { PAGE_TYPE_IDS, type PageTypeId } from "@/lib/qr/types";

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

  it("leaves switched-off links and buttons off the live page", () => {
    const links = {
      ...PAGE_DEFAULTS.links(),
      title: "Me",
      links: [
        { label: "Shown", url: "a.com", on: true },
        { label: "Hidden", url: "b.com", on: false },
      ],
    };
    const first = view("links", links, false);
    expect(screen.getByRole("link", { name: "Shown" })).toBeInTheDocument();
    expect(screen.queryByText("Hidden")).toBeNull();
    first.unmount();

    const business = {
      ...PAGE_DEFAULTS.business(),
      name: "Cafe",
      buttons: [
        { label: "Order", url: "o.com", on: false },
        { label: "Call us", url: "c.com", on: true },
      ],
    };
    view("business", business, false);
    expect(screen.queryByText("Order")).toBeNull();
    expect(screen.getByRole("link", { name: "Call us" })).toBeInTheDocument();
  });
});

const UID = "00000000-0000-0000-0000-000000000000";
const photo = { path: `${UID}/photo.jpg`, name: "photo.jpg", type: "image/jpeg", size: 1 };

/** A page of every type with its header images filled, where it has them. */
function filled(type: PageTypeId) {
  const page = PAGE_DEFAULTS[type]() as unknown as Record<string, unknown>;
  for (const key of ["avatar", "photo", "logo", "cover", "image", "icon"]) {
    if (key in page) page[key] = photo;
  }
  return page;
}

describe("PageView looks", () => {
  for (const type of PAGE_TYPE_IDS) {
    for (const header of ["classic", "hero"] as const) {
      for (const theme of ["paper", "midnight"] as const) {
        it(`${type}: ${header} on ${theme} has one h1, its landmark and the footer`, () => {
          const page = { ...filled(type), look: { ...themeLook(theme, type), header } };
          const { container } = view(type, page, false);
          expect(container.querySelectorAll("h1")).toHaveLength(1);
          expect(container.querySelector("main")).not.toBeNull();
          expect(screen.getByRole("link", { name: /Made with Ziplume/ })).toBeInTheDocument();
        });
      }
    }
  }

  it("sets the look on the page's own root, so the visitor's theme can't reach it", () => {
    const page = { ...PAGE_DEFAULTS.links(), look: themeLook("midnight", "links") };
    const { container } = view("links", page, false);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--fg")).toBe("#FFFFFF");
    expect(root.style.background).toContain("rgb(7, 11, 26)");
  });

  it("draws Classic when Hero has no image", () => {
    const page = {
      ...PAGE_DEFAULTS.links(),
      title: "Me",
      look: { ...themeLook("paper", "links"), header: "hero" as const },
    };
    const { container } = view("links", page, false);
    expect(container.querySelector("[data-header='classic']")).not.toBeNull();
  });

  it("puts social icons under the header or at the end, as the look says", () => {
    const socials = [{ network: "instagram" as const, url: "@me" }];
    const at = (socialsAt: "top" | "bottom") => {
      const page = {
        ...PAGE_DEFAULTS.links(),
        title: "Me",
        socials,
        look: { ...themeLook("paper", "links"), socials: socialsAt },
      };
      const { container, unmount } = view("links", page, false);
      const list = container.querySelector("[data-socials]")!;
      const nav = container.querySelector("nav[aria-label='Links']")!;
      const before = Boolean(list.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING);
      unmount();
      return before;
    };
    expect(at("top")).toBe(true);
    expect(at("bottom")).toBe(false);
  });

  it("keeps the preview's frame out of the landmarks", () => {
    const { container } = view("links", PAGE_DEFAULTS.links(), true);
    expect(container.querySelector("main")).toBeNull();
  });
});
