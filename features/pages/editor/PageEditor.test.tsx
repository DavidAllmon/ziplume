import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  PAGE_DEFAULTS,
  type LinksPage,
  type MenuPage,
  type PageContentMap,
} from "@/lib/pages/types";
import { limitAt } from "@/lib/pages/sanitize";
import { validatePage } from "@/lib/pages/validate";
import { PAGE_TYPE_IDS, type PageTypeId } from "@/lib/qr/types";

import { PageEditor } from "./PageEditor";
import { uploadMedia } from "./upload";

vi.mock("./upload", async (original) => ({ ...(await original<object>()), uploadMedia: vi.fn() }));
const UID = "11111111-1111-4111-8111-111111111111";

/** Every field each hosted-page form shows for a new page. Splitting the editor must keep them. */
const LABELS: Record<PageTypeId, string[]> = {
  links: ["Profile picture", "Title", "Bio"],
  vcard: [
    "Photo",
    "First name",
    "Last name",
    "Job title",
    "Company",
    "About",
    "Phone numbers",
    "Email addresses",
    "Website",
    "Address",
  ],
  business: [
    "Business name",
    "Tagline",
    "Logo",
    "Cover photo",
    "About",
    "Phone",
    "Email",
    "Website",
    "Address",
    "Show opening hours",
    "Buttons",
  ],
  menu: [
    "Restaurant name",
    "Currency",
    "Description",
    "Logo",
    "Sections",
    "Section name",
    "Dishes and drinks",
    "Name",
    "Price",
    "Tags",
    "Note",
  ],
  coupon: [
    "Business",
    "Offer",
    "Coupon code",
    "Headline",
    "Description",
    "Valid until",
    "Button text",
    "Button link",
    "Terms and conditions",
    "Image",
  ],
  event: [
    "Event name",
    "All-day event",
    "Starts",
    "Ends",
    "Location",
    "Description",
    "Organizer",
    "Ticket button text",
    "Ticket link",
    "Image",
  ],
  feedback: [
    "Business name",
    "Logo",
    "Question",
    "Ask for a comment",
    "Ask for contact details",
    "Thank-you message",
  ],
  pdf: ["PDF", "Title", "Description", "Open the PDF straight away"],
  images: ["Title", "Description"],
  video: ["Title", "Description"],
  audio: ["Audio file", "Or a link", "Title", "Artist", "Cover art", "Description"],
  app: ["App name", "Description", "App icon", "App Store link", "Google Play link", "Website"],
};

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

describe("PageEditor", () => {
  it("keeps one editor file per hosted-page type", () => {
    const dir = resolve(process.cwd(), "features/pages/editor/editors");
    const editors = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith("Editor.tsx")) : [];
    expect(editors).toHaveLength(PAGE_TYPE_IDS.length);
  });

  it("shows every error at once when asked to reveal them", () => {
    const errors = { title: "Add a title", "links.0.url": "Add at least one link" };
    const { rerender } = render(
      <PageEditor type="links" page={PAGE_DEFAULTS.links()} errors={errors} onUpdate={vi.fn()} />,
    );
    expect(screen.queryByText("Add a title")).toBeNull();
    rerender(
      <PageEditor
        type="links"
        page={PAGE_DEFAULTS.links()}
        errors={errors}
        onUpdate={vi.fn()}
        reveal
      />,
    );
    expect(screen.getByText("Add a title")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveAttribute("data-field", "title");
  });

  it.each(PAGE_TYPE_IDS)("%s shows all of its fields", (type) => {
    render(<PageEditor type={type} page={PAGE_DEFAULTS[type]()} errors={{}} onUpdate={vi.fn()} />);
    const missing = LABELS[type].filter(
      (label) => screen.queryAllByText(new RegExp(`^${escape(label)}`)).length === 0,
    );
    expect(missing).toEqual([]);
    if (type === "video") {
      expect(screen.getByRole("radiogroup", { name: "Video source" })).toBeInTheDocument();
    }
  });

  it.each(PAGE_TYPE_IDS)("%s: editing a field changes only that field", (type) => {
    const onUpdate = vi.fn();
    const page = PAGE_DEFAULTS[type]() as unknown as Record<string, unknown>;
    render(<PageEditor type={type} page={PAGE_DEFAULTS[type]()} errors={{}} onUpdate={onUpdate} />);
    fireEvent.change(screen.getAllByRole("textbox")[0]!, { target: { value: "Q" } });
    expect(onUpdate).toHaveBeenCalledTimes(1);
    // The update, applied to the page the test rendered.
    const next = onUpdate.mock.calls[0]![0](page) as Record<string, unknown>;
    expect(Object.keys(next).sort()).toEqual(Object.keys(page).sort());
    const changed = Object.keys(page).filter(
      (key) => JSON.stringify(next[key]) !== JSON.stringify(page[key]),
    );
    expect(changed).toHaveLength(1);
    expect(JSON.stringify(next[changed[0]!])).toContain("Q");
  });
});

function LinksForm({ initial }: { initial: LinksPage }) {
  const [page, setPage] = useState(initial);
  return (
    <PageEditor
      type="links"
      page={page}
      errors={validatePage("links", page)}
      onUpdate={(update) => setPage((p) => update(p))}
    />
  );
}

describe("PageEditor lists", () => {
  const links = (rows: { label: string; url: string }[]): LinksPage => ({
    ...PAGE_DEFAULTS.links(),
    title: "Me",
    links: rows.map((row) => ({ ...row, on: true })),
  });

  it("keeps an error on its row when the row moves", async () => {
    const user = userEvent.setup();
    render(
      <LinksForm
        initial={links([
          { label: "A", url: "a.com" },
          { label: "B", url: "" },
        ])}
      />,
    );
    await user.click(screen.getAllByLabelText("Link")[1]!);
    await user.tab();
    const message = "Add the link for “B”";
    expect(screen.getByText(message)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Actions for link “B”" }));
    await user.click(screen.getByRole("menuitem", { name: "Move up" }));
    const row = screen.getByText(message).closest("li")!;
    expect(within(row).getByLabelText("Button text")).toHaveValue("B");
  });

  it("switches a link off and back on", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const page = links([{ label: "Shop", url: "shop.com" }]);
    render(<PageEditor type="links" page={page} errors={{}} onUpdate={onUpdate} />);
    await user.click(screen.getByRole("switch", { name: "Show link “Shop” on the page" }));
    expect(onUpdate.mock.lastCall![0](page).links[0].on).toBe(false);
  });

  it("moves a menu section with its dishes", async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    const dish = (name: string) => ({ name, description: "", price: "", tags: "" });
    const menu: MenuPage = {
      ...PAGE_DEFAULTS.menu(),
      name: "Diner",
      sections: [
        { name: "Starters", items: [dish("Soup")] },
        { name: "Mains", items: [dish("Pie"), dish("Fish")] },
      ],
    };
    render(<PageEditor type="menu" page={menu} errors={{}} onUpdate={onUpdate} />);
    await user.click(screen.getByRole("button", { name: "Actions for section “Mains”" }));
    await user.click(screen.getByRole("menuitem", { name: "Move up" }));
    const next = onUpdate.mock.lastCall![0](menu) as MenuPage;
    expect(next.sections.map((s) => [s.name, s.items.map((d) => d.name)])).toEqual([
      ["Mains", ["Pie", "Fish"]],
      ["Starters", ["Soup"]],
    ]);
  });
});

/** The spec's cards for each type, in order (5.4). */
const CARDS: Record<PageTypeId, string[]> = {
  links: ["Header", "Links", "Social icons"],
  vcard: [
    "Header",
    "About",
    "Phone numbers",
    "Email addresses",
    "Website and address",
    "Social icons",
  ],
  business: ["Header", "Contact", "About", "Opening hours", "Buttons", "Social icons"],
  menu: ["Header", "Sections and dishes", "Currency and note"],
  coupon: ["Header", "Offer", "Button", "Terms"],
  event: ["Header", "When", "Where", "Details", "Tickets"],
  feedback: ["Header", "Question", "After sending"],
  pdf: ["File", "Details", "Opening"],
  images: ["Details", "Images"],
  video: ["Video", "Details"],
  audio: ["Audio", "Header", "Details"],
  app: ["Header", "Store links", "Website"],
};

describe("PageEditor cards", () => {
  it.each(PAGE_TYPE_IDS)("%s: its cards come in the spec's order", (type) => {
    render(
      <PageEditor type={type} page={PAGE_DEFAULTS[type]()} errors={{}} onUpdate={vi.fn()} cards />,
    );
    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(CARDS[type]);
  });

  it("draws the parts as sections inside the home page's form", () => {
    render(<PageEditor type="links" page={PAGE_DEFAULTS.links()} errors={{}} onUpdate={vi.fn()} />);
    expect(screen.queryAllByRole("heading", { level: 2 })).toHaveLength(0);
    const headings = screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent);
    expect(headings).toEqual(CARDS.links);
  });
});

function Stateful<K extends PageTypeId>({
  type,
  initial,
}: {
  type: K;
  initial: PageContentMap[K];
}) {
  const [page, setPage] = useState(initial);
  return (
    <PageEditor
      type={type}
      page={page}
      errors={{}}
      onUpdate={(update) => setPage((p) => update(p))}
    />
  );
}

describe("PageEditor focus", () => {
  const dish = (name: string) => ({ name, description: "", price: "", tags: "" });
  const menu: MenuPage = {
    ...PAGE_DEFAULTS.menu(),
    name: "Diner",
    sections: [
      { name: "Starters", items: [dish("Soup")] },
      { name: "Mains", items: [dish("Pie")] },
    ],
  };

  it("stays on a section's own ⋯ after moving it, and goes to the next section's on remove", async () => {
    const user = userEvent.setup();
    render(<Stateful type="menu" initial={menu} />);
    const mains = () => screen.getByRole("button", { name: "Actions for section “Mains”" });
    await user.click(mains());
    await user.click(screen.getByRole("menuitem", { name: "Move up" }));
    expect(mains()).toHaveFocus();
    await user.click(mains());
    await user.click(screen.getByRole("menuitem", { name: "Remove" }));
    expect(screen.getByRole("button", { name: "Actions for section “Starters”" })).toHaveFocus();
  });

  it("puts the cursor in a new phone's number and a new email's address", async () => {
    const user = userEvent.setup();
    render(<Stateful type="vcard" initial={PAGE_DEFAULTS.vcard()} />);
    await user.click(screen.getByRole("button", { name: "Add phone" }));
    expect(screen.getAllByLabelText("Number").at(-1)).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Add email" }));
    expect(screen.getAllByLabelText("Email").at(-1)).toHaveFocus();
  });
});

describe("an upload that finishes later", () => {
  // The harness keeps the page the way the editor's reducer does: each update applies to the
  // latest page.
  function Harness({ initial }: { initial: LinksPage }) {
    const [page, setPage] = useState(initial);
    return (
      <>
        <PageEditor
          type="links"
          page={page}
          errors={{}}
          onUpdate={(update) => setPage((p) => update(p))}
        />
        <output aria-label="Page">{JSON.stringify(page)}</output>
      </>
    );
  }

  it("keeps what was typed while it uploaded", async () => {
    const user = userEvent.setup();
    let finish!: (result: Awaited<ReturnType<typeof uploadMedia>>) => void;
    vi.mocked(uploadMedia).mockImplementation(() => new Promise((r) => (finish = r)));
    const { container } = render(<Harness initial={PAGE_DEFAULTS.links()} />);
    const input = container.querySelector<HTMLInputElement>("input[type=file]")!;
    await user.upload(input, new File(["x"], "me.png", { type: "image/png" }));
    await user.type(screen.getByLabelText("Title"), "Edited");
    const avatar = { path: `${UID}/me.png`, name: "me.png", type: "image/png", size: 1 };
    await act(async () => finish({ ok: true, media: avatar }));
    const page = JSON.parse(screen.getByRole("status", { name: "Page" }).textContent!);
    expect(page.title).toBe("Edited");
    expect(page.avatar).toEqual(avatar);
  });

  // PDF and audio fill the title from the file name, but only when there's no title yet.
  function Uploading<K extends "pdf" | "audio">({ type }: { type: K }) {
    const [page, setPage] = useState(PAGE_DEFAULTS[type]() as PageContentMap[K]);
    return (
      <>
        <PageEditor
          type={type}
          page={page}
          errors={{}}
          onUpdate={(update) => setPage((p) => update(p))}
        />
        <output aria-label="Page">{JSON.stringify(page)}</output>
      </>
    );
  }

  it.each([
    ["pdf", "menu.pdf", "application/pdf"],
    ["audio", "menu.mp3", "audio/mpeg"],
  ] as const)("keeps a %s title typed while its file uploads", async (type, name, mime) => {
    const user = userEvent.setup();
    let finish!: (result: Awaited<ReturnType<typeof uploadMedia>>) => void;
    vi.mocked(uploadMedia).mockImplementation(() => new Promise((r) => (finish = r)));
    const { container } = render(<Uploading type={type} />);
    const input = container.querySelector<HTMLInputElement>("input[type=file]")!;
    await user.upload(input, new File(["x"], name, { type: mime }));
    await user.type(screen.getByRole("textbox", { name: /^Title/ }), "Spring menu");
    const file = { path: `${UID}/${name}`, name, type: mime, size: 1 };
    await act(async () => finish({ ok: true, media: file }));
    const page = JSON.parse(screen.getByRole("status", { name: "Page" }).textContent!);
    expect(page.title).toBe("Spring menu");
    expect(page.file).toEqual(file);
  });
});

describe("text limits in the editor", () => {
  function Typing({ initial }: { initial: PageContentMap["video"] }) {
    const [page, setPage] = useState(initial);
    return (
      <PageEditor
        type="video"
        page={page}
        errors={validatePage("video", page)}
        onUpdate={(update) => setPage((p) => update(p))}
      />
    );
  }

  it("shows a counter on text of several lines, and keeps a paste over the limit", async () => {
    const user = userEvent.setup();
    render(<Typing initial={PAGE_DEFAULTS.video()} />);
    const box = screen.getByRole("textbox", { name: /^Description/ });
    expect(screen.getByText("0 / 1,000")).toBeInTheDocument();
    await user.click(box);
    await user.paste("x".repeat(1200));
    expect(box).toHaveValue("x".repeat(1200));
    expect(screen.getByText("Shorten by 200 characters")).toBeInTheDocument();
    expect(screen.getByText("1,200 / 1,000")).toBeInTheDocument();
    expect(box).toHaveAttribute("aria-invalid", "true");
    expect(box).not.toHaveAttribute("maxlength");
  });

  it("shows a one-line box's counter only near its limit", async () => {
    const user = userEvent.setup();
    render(<Typing initial={PAGE_DEFAULTS.video()} />);
    const title = screen.getByRole("textbox", { name: /^Title/ });
    await user.type(title, "x".repeat(99));
    expect(screen.queryByText(/ \/ 120$/)).toBeNull();
    await user.type(title, "x");
    expect(screen.getByText("100 / 120")).toBeInTheDocument();
  });

  it.each(PAGE_TYPE_IDS)("%s: every text box has a limit from the page's schema", (type) => {
    const page = PAGE_DEFAULTS[type]() as unknown as Record<string, unknown>;
    // One of everything in lists, so their rows render.
    if (type === "menu") {
      page.sections = [{ name: "", items: [{ name: "", description: "", price: "", tags: "" }] }];
    }
    if (type === "business" || type === "links") {
      page.socials = [{ network: "instagram", url: "" }];
    }
    if (type === "business") page.buttons = [{ label: "", url: "", on: true }];
    if (type === "vcard") page.socials = [{ network: "instagram", url: "" }];
    const { container } = render(
      <PageEditor type={type} page={page as never} errors={{}} onUpdate={vi.fn()} reveal />,
    );
    const boxes = [
      ...container.querySelectorAll<HTMLElement>("input:not([type=file]), textarea"),
    ].filter(
      // Opening hours are time boxes with a fixed shape, checked by the hours schema, not text.
      (el) =>
        !["checkbox", "radio", "range", "color", "time"].includes(el.getAttribute("type") ?? ""),
    );
    expect(boxes.length).toBeGreaterThan(0);
    for (const box of boxes) {
      const path = box.getAttribute("data-field");
      expect(path, `${type}: ${box.outerHTML.slice(0, 80)}`).toBeTruthy();
      expect(limitAt(type, path!), `${type}.${path}`).not.toBeNull();
    }
  });
});
