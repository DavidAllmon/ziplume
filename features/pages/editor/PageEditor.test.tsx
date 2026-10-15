import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { PAGE_DEFAULTS, type LinksPage, type MenuPage } from "@/lib/pages/types";
import { validatePage } from "@/lib/pages/validate";
import { PAGE_TYPE_IDS, type PageTypeId } from "@/lib/qr/types";

import { PageEditor } from "./PageEditor";

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
      <PageEditor type="links" page={PAGE_DEFAULTS.links()} errors={errors} onChange={vi.fn()} />,
    );
    expect(screen.queryByText("Add a title")).toBeNull();
    rerender(
      <PageEditor
        type="links"
        page={PAGE_DEFAULTS.links()}
        errors={errors}
        onChange={vi.fn()}
        reveal
      />,
    );
    expect(screen.getByText("Add a title")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveAttribute("data-field", "title");
  });

  it.each(PAGE_TYPE_IDS)("%s shows all of its fields", (type) => {
    render(<PageEditor type={type} page={PAGE_DEFAULTS[type]()} errors={{}} onChange={vi.fn()} />);
    const missing = LABELS[type].filter(
      (label) => screen.queryAllByText(new RegExp(`^${escape(label)}`)).length === 0,
    );
    expect(missing).toEqual([]);
    if (type === "video") {
      expect(screen.getByRole("radiogroup", { name: "Video source" })).toBeInTheDocument();
    }
  });

  it.each(PAGE_TYPE_IDS)("%s: editing a field changes only that field", (type) => {
    const onChange = vi.fn();
    const page = PAGE_DEFAULTS[type]() as unknown as Record<string, unknown>;
    render(<PageEditor type={type} page={PAGE_DEFAULTS[type]()} errors={{}} onChange={onChange} />);
    fireEvent.change(screen.getAllByRole("textbox")[0]!, { target: { value: "Q" } });
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]![0] as Record<string, unknown>;
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
    <PageEditor type="links" page={page} errors={validatePage("links", page)} onChange={setPage} />
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
    const onChange = vi.fn();
    render(
      <PageEditor
        type="links"
        page={links([{ label: "Shop", url: "shop.com" }])}
        errors={{}}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("switch", { name: "Show link “Shop” on the page" }));
    expect(onChange.mock.lastCall![0].links[0].on).toBe(false);
  });

  it("moves a menu section with its dishes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const dish = (name: string) => ({ name, description: "", price: "", tags: "" });
    const menu: MenuPage = {
      ...PAGE_DEFAULTS.menu(),
      name: "Diner",
      sections: [
        { name: "Starters", items: [dish("Soup")] },
        { name: "Mains", items: [dish("Pie"), dish("Fish")] },
      ],
    };
    render(<PageEditor type="menu" page={menu} errors={{}} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Actions for section “Mains”" }));
    await user.click(screen.getByRole("menuitem", { name: "Move up" }));
    const next = onChange.mock.lastCall![0] as MenuPage;
    expect(next.sections.map((s) => [s.name, s.items.map((d) => d.name)])).toEqual([
      ["Mains", ["Pie", "Fish"]],
      ["Starters", ["Soup"]],
    ]);
  });
});
