import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { newHeader, newLink } from "@/lib/pages/links";
import { newDish } from "@/lib/pages/menu";
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
    const video = {
      ...PAGE_DEFAULTS.video(),
      title: "Clip",
      videos: [{ title: "", url: "https://youtu.be/dQw4w9WgXcQ", start: "" }],
    };
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

describe("Business hours", () => {
  it("lists a split day's two ranges in the opening hours", () => {
    const hours = PAGE_DEFAULTS.business().hours.map((h) => ({ ...h, from2: "", to2: "" }));
    hours[0] = { open: true, from: "09:00", to: "12:00", from2: "13:00", to2: "17:00" };
    view("business", { ...PAGE_DEFAULTS.business(), name: "Bakery", hours }, false);
    expect(screen.getByText("9:00 AM – 12:00 PM, 1:00 PM – 5:00 PM")).toBeInTheDocument();
  });
});

describe("Open now", () => {
  afterEach(() => vi.useRealTimers());

  it("shows on the live page in the business's time zone, never in the editor's preview", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2030-01-07T15:00:00Z")); // Monday 10:00 in New York
    const page = { ...PAGE_DEFAULTS.business(), name: "Bakery", timeZone: "America/New_York" };
    const { unmount } = view("business", page, false);
    expect(screen.getByText("Open now · closes 5:00 PM")).toBeInTheDocument();
    unmount();
    view("business", page, true);
    expect(screen.queryByText(/Open now|Closed ·/)).toBeNull();
  });
});

describe("Business extras", () => {
  it("shows a gallery row that opens the viewer, and the services under About", () => {
    view(
      "business",
      {
        ...PAGE_DEFAULTS.business(),
        name: "Bakery",
        about: "Fresh bread",
        gallery: [media("1.jpg", "image/jpeg"), media("2.jpg", "image/jpeg")],
        services: [
          { name: "Cake order", price: "$40", description: "Two days' notice" },
          { name: "", price: "$1", description: "" },
        ],
      },
      false,
    );
    expect(screen.getByRole("button", { name: "Open photo 1 of 2" })).toBeInTheDocument();
    const services = within(screen.getByRole("region", { name: "Services" }));
    expect(services.getByText("Cake order")).toBeInTheDocument();
    expect(services.getByText("$40")).toBeInTheDocument();
    expect(services.getAllByRole("listitem")).toHaveLength(1);
  });

  it("draws a ready-made button with its icon", () => {
    const { container } = view(
      "business",
      {
        ...PAGE_DEFAULTS.business(),
        name: "Bakery",
        buttons: [
          { ...newLink(), label: "Leave a Google review", url: "g.page/r/abc", icon: "review" },
        ],
      },
      false,
    );
    const button = screen.getByRole("link", { name: /Leave a Google review/ });
    expect(button.querySelector("[data-link-icon]")).not.toBeNull();
    expect(container.querySelector("[data-link-icon]")).not.toBeNull();
  });
});

describe("WhatsApp quick button", () => {
  it("is left out when the WhatsApp number has no country code", () => {
    view(
      "vcard",
      {
        ...PAGE_DEFAULTS.vcard(),
        firstName: "Ana",
        phones: [{ label: "Mobile", number: "(555) 010-2030", whatsapp: true }],
      },
      false,
    );
    const actions = within(screen.getByRole("navigation", { name: "Quick actions" }));
    expect(actions.getByRole("link", { name: "Call" })).toBeInTheDocument();
    expect(actions.queryByRole("link", { name: "WhatsApp" })).toBeNull();
  });
});

describe("Menu extras", () => {
  const dish = (patch: object) => ({ ...newDish(), ...patch });
  const menu = (items: object[]) => ({
    ...PAGE_DEFAULTS.menu(),
    name: "Diner",
    sections: [{ name: "Mains", description: "Served all day", items }],
  });

  it("shows labels, Popular, Sold out and price options, and leaves hidden dishes out", () => {
    view(
      "menu",
      menu([
        dish({ name: "Chili", price: "9", labels: ["spicy", "vegan"], popular: true }),
        dish({ name: "Pie", price: "5", soldOut: true }),
        dish({ name: "Secret", price: "1", on: false }),
        dish({
          name: "Pizza",
          price: "10",
          options: [
            { label: "Small", price: "8" },
            { label: "Large", price: "12" },
          ],
        }),
      ]),
      false,
    );
    expect(screen.getByText("Served all day")).toBeInTheDocument();
    const chili = screen.getByText("Chili").closest("li")!;
    expect(within(chili).getByText("Spicy")).toBeInTheDocument();
    expect(within(chili).getByText("Vegan")).toBeInTheDocument();
    expect(within(chili).getByText("Popular")).toBeInTheDocument();
    const pie = screen.getByText("Pie").closest("li")!;
    expect(within(pie).getByText("Sold out")).toBeInTheDocument();
    expect(screen.queryByText("Secret")).toBeNull();
    const pizza = screen.getByText("Pizza").closest("li")!;
    expect(within(pizza).getByText("Small $8")).toBeInTheDocument();
    expect(within(pizza).getByText("Large $12")).toBeInTheDocument();
    expect(within(pizza).queryByText("$10")).toBeNull();
  });

  it("opens a dish's photo full screen, captioned with its name, counting only dishes with one", async () => {
    const user = userEvent.setup();
    view(
      "menu",
      menu([
        dish({ name: "Soup", price: "4" }),
        dish({ name: "Hidden", price: "4", on: false, photo: media("h.jpg", "image/jpeg") }),
        dish({ name: "Chili", price: "9", photo: media("chili.jpg", "image/jpeg") }),
        dish({ name: "Pie", price: "5", photo: media("pie.jpg", "image/jpeg") }),
      ]),
      false,
    );
    await user.click(screen.getByRole("button", { name: "Photo of Pie" }));
    const dialog = screen.getByRole("dialog", { name: "Photo 2 of 2" });
    expect(within(dialog).getByText("Pie")).toBeInTheDocument();
  });

  it("shows dish photos but opens nothing in the editor's preview", () => {
    view(
      "menu",
      menu([dish({ name: "Pie", price: "5", photo: media("pie.jpg", "image/jpeg") })]),
      true,
    );
    expect(screen.queryByRole("button", { name: "Photo of Pie" })).toBeNull();
    expect(screen.getByRole("img", { name: "Pie" })).toBeInTheDocument();
  });
});

describe("Coupon extras", () => {
  afterEach(() => vi.useRealTimers());

  it("shows the badge, the code to scan, and the countdown", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2030, 0, 1, 12));
    view(
      "coupon",
      {
        ...PAGE_DEFAULTS.coupon(),
        offer: "20% OFF",
        badge: "NEW",
        code: "SAVE20",
        scan: "qr",
        validUntil: "2030-01-04",
      },
      false,
    );
    expect(screen.getByText("NEW")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "QR code for SAVE20" })).toBeInTheDocument();
    expect(screen.getByText("Ends in 3 days")).toBeInTheDocument();
  });

  it("keeps an old coupon's code as text only", () => {
    view("coupon", { ...PAGE_DEFAULTS.coupon(), offer: "20% OFF", code: "SAVE20" }, false);
    expect(screen.queryByRole("img", { name: /SAVE20/ })).toBeNull();
    expect(screen.getByText("SAVE20")).toBeInTheDocument();
  });
});

describe("Event extras", () => {
  afterEach(() => vi.useRealTimers());
  // 13:00 in New York is 18:00 UTC in January.
  const event = (patch: object = {}) => ({
    ...PAGE_DEFAULTS.event(),
    title: "Launch",
    start: "2030-01-10T13:00",
    end: "2030-01-10T16:00",
    timeZone: "America/New_York",
    location: "1 Main St",
    online: true,
    joinUrl: "https://meet.example.com/launch",
    ...patch,
  });

  it("counts down, and turns the Join button on 15 minutes before the start", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2030-01-10T17:35:00Z"));
    const { unmount } = view("event", event(), false);
    expect(screen.getByText("Starts in 25 minutes")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Join online/ })).toBeNull();
    expect(screen.getByText("The link opens 15 minutes before the start")).toBeInTheDocument();
    unmount();
    vi.setSystemTime(new Date("2030-01-10T17:50:00Z"));
    view("event", event(), false);
    expect(screen.getByRole("link", { name: /Join online/ })).toHaveAttribute(
      "href",
      "https://meet.example.com/launch",
    );
  });

  it("shows the online event, Directions to the place, the agenda and the hosts", () => {
    view(
      "event",
      event({
        agenda: [{ time: "13:00", title: "Doors open", note: "Coffee" }],
        hosts: [{ photo: null, name: "Ana Rivera", role: "Host" }],
      }),
      false,
    );
    expect(screen.getByText("Online event")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Directions" })).toHaveAttribute(
      "href",
      expect.stringContaining("maps"),
    );
    const agenda = within(screen.getByRole("region", { name: "Agenda" }));
    expect(agenda.getByText("1:00 PM")).toBeInTheDocument();
    expect(agenda.getByText("Doors open")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "Hosts" })).getByText("Ana Rivera"),
    ).toBeInTheDocument();
  });

  it("keeps the Join button inert in the editor's preview", () => {
    view("event", event(), true);
    expect(screen.queryByRole("link", { name: /Join online/ })).toBeNull();
  });
});

describe("An event in a time zone this browser doesn't know", () => {
  it("shows the page without a countdown, and lets visitors join", () => {
    view(
      "event",
      {
        ...PAGE_DEFAULTS.event(),
        title: "Launch",
        start: "2030-01-10T13:00",
        timeZone: "Mars/Base",
        online: true,
        joinUrl: "https://meet.example.com/launch",
      },
      false,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Launch");
    expect(screen.queryByText(/^Starts in|Happening now|has ended/)).toBeNull();
    // Without a time to check, the link can't be held back.
    expect(screen.getByRole("link", { name: /Join online/ })).toHaveAttribute(
      "href",
      "https://meet.example.com/launch",
    );
  });
});

describe("Images extras", () => {
  const item = (n: number, patch: object = {}) => ({
    image: media(`${n}.jpg`, "image/jpeg"),
    caption: "",
    link: "",
    ...patch,
  });
  const images = (list: object[], layout = "grid2") => ({
    ...PAGE_DEFAULTS.images(),
    title: "Trip",
    images: list,
    layout,
  });

  it("names each image by its caption or its place, and opens it in the viewer with its link", async () => {
    const user = userEvent.setup();
    view(
      "images",
      images([item(1, { caption: "Sunset", link: "example.com/sunset" }), item(2)]),
      false,
    );
    expect(screen.getByRole("button", { name: "Image 2 of 2" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Sunset" }));
    const dialog = screen.getByRole("dialog", { name: "Photo 1 of 2" });
    expect(within(dialog).getByText("Sunset")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Open link" })).toHaveAttribute(
      "href",
      "https://example.com/sunset",
    );
  });

  it("lays images out in 2 or 3 columns, or one column with captions", () => {
    const list = [item(1, { caption: "Sunset" }), item(2), item(3)];
    const { container, unmount } = view("images", images(list, "grid3"), false);
    expect(container.querySelector("[data-layout=grid3]")).not.toBeNull();
    expect(screen.queryByText("Sunset")).toBeNull();
    unmount();
    const one = view("images", images(list, "single"), false);
    expect(one.container.querySelector("[data-layout=single]")).not.toBeNull();
    expect(screen.getByText("Sunset")).toBeInTheDocument();
  });

  it("shows a carousel with dots for a few images, and a counter for more", async () => {
    const user = userEvent.setup();
    const { unmount } = view("images", images([item(1), item(2), item(3)], "carousel"), false);
    expect(screen.getByRole("button", { name: "Go to image 2 of 3" })).toBeInTheDocument();
    unmount();
    view(
      "images",
      images(
        [1, 2, 3, 4, 5, 6, 7].map((n) => item(n)),
        "carousel",
      ),
      false,
    );
    expect(screen.queryByRole("button", { name: /^Go to image/ })).toBeNull();
    expect(screen.getByText("1 of 7")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous image" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await user.click(screen.getByRole("button", { name: "Next image" }));
    expect(screen.getByText("2 of 7")).toBeInTheDocument();
  });

  it("keeps images still in the editor's preview", () => {
    view("images", images([item(1, { caption: "Sunset" })], "carousel"), true);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("img", { name: "Sunset" })).toBeInTheDocument();
  });
});

describe("Video extras", () => {
  const video = (videos: object[], description = "About these") => ({
    ...PAGE_DEFAULTS.video(),
    title: "Clips",
    description,
    videos,
  });
  const v = (url: string, patch: object = {}) => ({ title: "", url, start: "", ...patch });

  it("holds a TikTok back until it's tapped", async () => {
    const user = userEvent.setup();
    const { container } = view(
      "video",
      video([v("https://www.tiktok.com/@cafe/video/7234567890123456789")]),
      false,
    );
    expect(container.querySelector("iframe")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Tap to play from TikTok" }));
    expect(container.querySelector("iframe")).toHaveAttribute(
      "src",
      "https://www.tiktok.com/embed/v2/7234567890123456789",
    );
  });

  it("plays YouTube in place from its start time", () => {
    const { container } = view(
      "video",
      video([v("https://youtu.be/dQw4w9WgXcQ", { start: "1:23" })]),
      false,
    );
    expect(container.querySelector("iframe")).toHaveAttribute(
      "src",
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=83",
    );
  });

  it("gives each of several videos its own card and title, with the description at the top", () => {
    view(
      "video",
      video([
        v("https://youtu.be/dQw4w9WgXcQ", { title: "Trailer" }),
        v("https://www.loom.com/share/0123456789abcdef0123456789abcdef", {
          title: "Behind the scenes",
        }),
      ]),
      false,
    );
    expect(screen.getByRole("heading", { level: 2, name: "Trailer" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Behind the scenes" }),
    ).toBeInTheDocument();
    // Under the page title, before the first video.
    const description = screen.getByText("About these");
    const first = screen.getByRole("heading", { level: 2, name: "Trailer" });
    expect(
      description.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("keeps players still in the editor's preview", () => {
    const { container } = view(
      "video",
      video([v("https://www.tiktok.com/@cafe/video/7234567890123456789")]),
      true,
    );
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.queryByRole("button", { name: /Tap to play/ })).toBeNull();
  });
});

describe("App extras", () => {
  it("shows tall screenshots that open in the viewer, and the features", () => {
    view(
      "app",
      {
        ...PAGE_DEFAULTS.app(),
        name: "Tasks",
        iosUrl: "https://apps.apple.com/app/id1",
        screenshots: [media("s1.png", "image/png"), media("s2.png", "image/png")],
        features: [{ text: "Works offline" }, { text: "" }, { text: "Syncs everywhere" }],
      },
      false,
    );
    expect(screen.getByRole("button", { name: "Open photo 1 of 2" })).toBeInTheDocument();
    const features = within(screen.getByRole("region", { name: "Features" }));
    expect(features.getAllByRole("listitem")).toHaveLength(2);
    expect(features.getByText("Works offline")).toBeInTheDocument();
  });
});

describe("Images and Video fixes", () => {
  const item = (n: number, patch: object = {}) => ({
    image: media(`${n}.jpg`, "image/jpeg"),
    caption: "",
    link: "",
    ...patch,
  });

  it("draws a carousel slide's focus ring inside it, where the row can't clip it", () => {
    view(
      "images",
      { ...PAGE_DEFAULTS.images(), images: [item(1), item(2)], layout: "carousel" },
      false,
    );
    expect(screen.getByRole("button", { name: "Image 1 of 2" }).className).toMatch(
      /focus-visible:-outline-offset-\d/,
    );
  });

  it("keeps an old one-video page's description above its Watch video button", () => {
    view(
      "video",
      {
        ...PAGE_DEFAULTS.video(),
        title: "Clip",
        description: "About it",
        videos: [{ title: "", url: "https://example.com/video", start: "" }],
      },
      false,
    );
    const description = screen.getByText("About it");
    const watch = screen.getByRole("link", { name: /Watch video/ });
    expect(
      description.compareDocumentPosition(watch) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
