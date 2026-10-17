import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { newHeader, newLink } from "@/lib/pages/links";
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
  it("draws social icons in the look's style and size, keeping a 44px target", () => {
    const content = {
      ...PAGE_DEFAULTS.links(),
      title: "Hi",
      socials: [{ network: "facebook", url: "me" }],
      look: { ...themeLook("paper", "links"), socialStyle: "brand", socialSize: "small" },
    };
    const { container } = view("links", content, false);
    const link = container.querySelector<HTMLElement>("[data-socials] a")!;
    expect(link.className).toContain("size-11");
    const mark = link.querySelector<HTMLElement>("[data-social-mark]")!;
    expect(mark.className).toContain("size-9");
    expect(mark.style.backgroundColor).toBe("rgb(8, 102, 255)");
    expect(mark.style.color).toBe("rgb(255, 255, 255)");
  });
  it("puts a Share button on every public page, and links addresses in its text", () => {
    for (const type of PAGE_TYPE_IDS) {
      const { unmount } = view(type, PAGE_DEFAULTS[type](), false);
      expect(screen.getByRole("button", { name: "Share this page" }), type).toBeInTheDocument();
      unmount();
    }
    view(
      "pdf",
      { ...PAGE_DEFAULTS.pdf(), title: "Menu", description: "Order at www.example.com" },
      false,
    );
    expect(screen.getByRole("link", { name: "www.example.com" })).toBeInTheDocument();
  });
  it("shows a video page saved with an upload as a placeholder, never a player", () => {
    const old = {
      ...PAGE_DEFAULTS.video(),
      title: "Sample: Video",
      source: "upload",
      file: media("v.mp4", "video/mp4"),
    };
    const { container } = view("video", old, false);
    expect(container.querySelector("video, iframe")).toBeNull();
  });
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

describe("PageView details", () => {
  it("draws no empty card on a Business page without contact details", () => {
    const page = { ...PAGE_DEFAULTS.business(), name: "Cafe" };
    const { container } = view("business", page, false);
    for (const section of container.querySelectorAll("section")) {
      expect(section.textContent?.trim()).not.toBe("");
    }
  });

  it("draws quieter buttons in the note tone, which reads on every theme", () => {
    const page = {
      ...PAGE_DEFAULTS.event(),
      title: "Fair",
      start: "2031-05-01T10:00",
      timeZone: "UTC",
    };
    view("event", page, false);
    expect(screen.getByRole("link", { name: /Calendar/ })).toHaveClass("bg-surface-2");
  });

  it("colors the feedback stars with the page's accent, and the empty ones readably", () => {
    const page = { ...PAGE_DEFAULTS.feedback(), business: "Cafe", question: "How was it?" };
    const { container } = view("feedback", page, false);
    const stars = container.querySelectorAll("svg.lucide-star");
    expect(stars.length).toBe(5);
    for (const star of stars) expect(star.getAttribute("class")).toContain("text-fg-muted");
  });
});

describe("Link list extras", () => {
  it("never shows visitors the editor's hint when every link is outside its schedule", () => {
    const later = {
      ...newLink(),
      label: "Later",
      url: "a.com",
      showFrom: "2999-01-01T00:00:00.000Z",
    };
    const { unmount } = view(
      "links",
      { ...PAGE_DEFAULTS.links(), title: "Hi", links: [later] },
      false,
    );
    expect(screen.queryByText("Links you add appear here.")).toBeNull();
    unmount();
    view("links", { ...PAGE_DEFAULTS.links(), title: "Hi", links: [later] }, true);
    expect(screen.getByText("Links you add appear here.")).toBeInTheDocument();
  });

  const page = (links: object[]) => ({ ...PAGE_DEFAULTS.links(), title: "Hi", links });

  it("draws headers between links, and skips empty ones", () => {
    view(
      "links",
      page([
        { ...newHeader(), label: "Shop" },
        { ...newLink(), label: "Store", url: "shop.com" },
        { ...newHeader(), label: "  " },
      ]),
      false,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Shop" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
  });

  it("links each type to the right address, and draws no button for a bad one", () => {
    view(
      "links",
      page([
        { ...newLink(), label: "Email us", type: "email", url: "hi@shop.com" },
        { ...newLink(), label: "Text us", type: "sms", url: "555 010 2030" },
        { ...newLink(), label: "Broken", type: "phone", url: "letters" },
      ]),
      false,
    );
    expect(screen.getByRole("link", { name: /Email us/ })).toHaveAttribute(
      "href",
      "mailto:hi@shop.com",
    );
    expect(screen.getByRole("link", { name: /Text us/ })).toHaveAttribute("href", "sms:5550102030");
    expect(screen.queryByRole("link", { name: /Broken/ })).toBeNull();
  });

  it("puts a known site's icon on its link, and none on an unknown one", () => {
    const { container } = view(
      "links",
      page([
        { ...newLink(), label: "Instagram", url: "instagram.com/me" },
        { ...newLink(), label: "Blog", url: "example.com" },
      ]),
      false,
    );
    const links = container.querySelectorAll("nav[aria-label=Links] a");
    expect(links[0]!.querySelector("[data-link-icon]")).not.toBeNull();
    expect(links[1]!.querySelector("[data-link-icon]")).toBeNull();
  });

  it("draws the featured link taller, and only the first one", () => {
    const { container } = view(
      "links",
      page([
        { ...newLink(), label: "One", url: "a.com", featured: true },
        { ...newLink(), label: "Two", url: "b.com", featured: true },
      ]),
      false,
    );
    const links = container.querySelectorAll("nav[aria-label=Links] a");
    expect(links[0]).toHaveAttribute("data-featured");
    expect(links[1]).not.toHaveAttribute("data-featured");
  });

  it("hides a link outside its schedule", () => {
    view(
      "links",
      page([
        { ...newLink(), label: "Later", url: "a.com", showFrom: "2999-01-01T00:00:00.000Z" },
        { ...newLink(), label: "Now", url: "b.com" },
      ]),
      false,
    );
    expect(screen.queryByRole("link", { name: /Later/ })).toBeNull();
    expect(screen.getByRole("link", { name: /Now/ })).toBeInTheDocument();
  });

  it("keeps an old saved list exactly as before: no icons, no headers", () => {
    const { container } = view(
      "links",
      {
        ...PAGE_DEFAULTS.links(),
        title: "Hi",
        links: [{ label: "Blog", url: "example.com", on: true }],
      },
      false,
    );
    expect(container.querySelector("[data-link-icon]")).toBeNull();
    expect(screen.getByRole("link", { name: "Blog" })).toHaveAttribute(
      "href",
      "https://example.com/",
    );
  });
});

describe("Contact page extras", () => {
  const ana = (patch: object = {}) => ({
    ...PAGE_DEFAULTS.vcard(),
    firstName: "Ana",
    jobTitle: "Designer",
    department: "Brand",
    company: "Acme",
    pronouns: "she/her",
    phones: [
      { label: "Mobile", number: "+1 555 010 2030", whatsapp: false },
      { label: "Work", number: "+1 555 010 4040", whatsapp: true },
    ],
    emails: [{ label: "Work", address: "ana@acme.com" }],
    address: "1 Main St",
    ...patch,
  });

  it("draws Call, Text, Email, WhatsApp and Directions from the first details", () => {
    view("vcard", ana(), false);
    const actions = within(screen.getByRole("navigation", { name: "Quick actions" }));
    expect(actions.getByRole("link", { name: "Call" })).toHaveAttribute("href", "tel:+15550102030");
    expect(actions.getByRole("link", { name: "Text" })).toHaveAttribute("href", "sms:+15550102030");
    expect(actions.getByRole("link", { name: "Email" })).toHaveAttribute(
      "href",
      "mailto:ana@acme.com",
    );
    expect(actions.getByRole("link", { name: "WhatsApp" })).toHaveAttribute(
      "href",
      "https://wa.me/15550104040",
    );
    expect(actions.getByRole("link", { name: "Directions" })).toBeInTheDocument();
  });

  it("leaves out buttons that are off or can't work, and the whole row when none can", () => {
    const { unmount } = view(
      "vcard",
      ana({ showText: false, phones: [{ label: "", number: "+1 555 010 2030", whatsapp: false }] }),
      false,
    );
    const actions = within(screen.getByRole("navigation", { name: "Quick actions" }));
    expect(actions.queryByRole("link", { name: "Text" })).toBeNull();
    expect(actions.queryByRole("link", { name: "WhatsApp" })).toBeNull();
    unmount();
    view("vcard", ana({ phones: [], emails: [], address: "" }), false);
    expect(screen.queryByRole("navigation", { name: "Quick actions" })).toBeNull();
  });

  it("shows pronouns by the name, and the department in the role", () => {
    view("vcard", ana(), false);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Ana (she/her)");
    expect(screen.getByText("Designer · Brand · Acme")).toBeInTheDocument();
  });

  it("draws the cover across the top with the photo over it", () => {
    const { container } = view(
      "vcard",
      ana({ cover: media("cover.jpg", "image/jpeg"), photo: media("me.jpg", "image/jpeg") }),
      false,
    );
    expect(container.querySelector("[data-header=banner]")).not.toBeNull();
    expect(container.querySelector("[data-header=banner] [data-badge]")).not.toBeNull();
  });

  it("lists each website with its label", () => {
    view(
      "vcard",
      ana({
        websites: [
          { label: "Portfolio", url: "ana.dev" },
          { label: "", url: "acme.com" },
        ],
      }),
      false,
    );
    expect(screen.getByText("Portfolio")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ana\.dev/ })).toHaveAttribute(
      "href",
      "https://ana.dev/",
    );
  });
});
