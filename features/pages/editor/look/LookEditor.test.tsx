import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import { uploadMedia } from "@/features/pages/editor/upload";
import { themeLook } from "@/lib/pages/look";
import { PAGE_DEFAULTS, type PageContentMap } from "@/lib/pages/types";
import type { PageTypeId } from "@/lib/qr/types";

import { LookEditor } from "./LookEditor";

vi.mock("@/features/pages/editor/upload", async (original) => ({
  ...(await original<object>()),
  uploadMedia: vi.fn(),
}));
vi.mock("@/features/pages/look/average", () => ({ averageColor: vi.fn(async () => "#F3E8D8") }));

const UID = "11111111-1111-4111-8111-111111111111";
const fileInput = (container: HTMLElement) =>
  container.querySelector<HTMLInputElement>("input[type=file]")!;

function Harness<K extends PageTypeId>({ type, initial }: { type: K; initial: PageContentMap[K] }) {
  const [page, setPage] = useState(initial);
  return (
    <ToastProvider>
      <LookEditor
        type={type}
        page={page}
        onLook={(update) => setPage((p) => ({ ...p, look: update(p.look) }))}
      />
      <output aria-label="Look">{JSON.stringify(page.look)}</output>
      {/* An edit on another tab, made while the Look tab is open. */}
      <button type="button" onClick={() => setPage((p) => ({ ...p, title: "Edited" }))}>
        Edit title
      </button>
      <output aria-label="Title">{"title" in page ? String(page.title) : ""}</output>
    </ToastProvider>
  );
}
const look = () => JSON.parse(screen.getByRole("status", { name: "Look" }).textContent!);
const title = () => screen.getByRole("status", { name: "Title" }).textContent;
const IMAGE = { path: `${UID}/w.jpg`, name: "w.jpg", type: "image/jpeg", size: 1 };
/** An upload that finishes when the test says so. */
function slowUpload() {
  let finish!: (result: Awaited<ReturnType<typeof uploadMedia>>) => void;
  vi.mocked(uploadMedia).mockImplementation(() => new Promise((resolve) => (finish = resolve)));
  return (result: Awaited<ReturnType<typeof uploadMedia>>) => act(async () => finish(result));
}

describe("LookEditor", () => {
  it("shows the cards in the spec's order", () => {
    render(<Harness type="links" initial={PAGE_DEFAULTS.links()} />);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Theme",
      "Header",
      "Wallpaper",
      "Text",
      "Buttons",
      "Social icons",
    ]);
  });

  it("leaves out Header and Social icons where a type has neither", () => {
    render(<Harness type="pdf" initial={PAGE_DEFAULTS.pdf()} />);
    const titles = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    expect(titles).not.toContain("Header");
    expect(titles).not.toContain("Social icons");
  });

  it("picks a theme, keeps the header, and the toast undoes just the latest pick", async () => {
    const user = userEvent.setup();
    const start = {
      ...PAGE_DEFAULTS.links(),
      look: { ...themeLook("paper", "links"), header: "hero" as const },
    };
    render(<Harness type="links" initial={start} />);
    await user.click(screen.getByRole("radio", { name: "Ocean" }));
    expect(look()).toMatchObject({ theme: "ocean", header: "hero" });
    await user.click(screen.getByRole("radio", { name: "Forest" }));
    // The second pick's toast replaces the first one.
    expect(screen.getAllByRole("button", { name: "Undo" })).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(look().theme).toBe("ocean");
    await waitFor(() => expect(screen.getByRole("radio", { name: "Ocean" })).toHaveFocus());
  });

  it("steps back through theme picks from the Theme card, by keyboard too", async () => {
    const user = userEvent.setup();
    const custom = { ...themeLook("paper", "links"), font: "typewriter" as const };
    render(<Harness type="links" initial={{ ...PAGE_DEFAULTS.links(), look: custom }} />);
    screen.getByRole("radio", { name: "Paper" }).focus();
    // Arrow keys pick each theme on the way: Midnight, Ocean, Sunset.
    await user.keyboard("{ArrowRight}{ArrowRight}{ArrowRight}");
    expect(look().theme).toBe("sunset");
    const undo = screen.getByRole("button", { name: "Undo theme" });
    await user.click(undo);
    expect(look().theme).toBe("ocean");
    await user.click(undo);
    await user.click(undo);
    expect(look()).toEqual(custom);
    expect(screen.queryByRole("button", { name: "Undo theme" })).toBeNull();
    await waitFor(() => expect(screen.getByRole("radio", { name: "Paper" })).toHaveFocus());
  });

  it("drops Undo once the look is changed another way", async () => {
    const user = userEvent.setup();
    render(<Harness type="links" initial={PAGE_DEFAULTS.links()} />);
    await user.click(screen.getByRole("radio", { name: "Ocean" }));
    await user.click(screen.getByRole("radio", { name: "Typewriter" }));
    expect(screen.queryByRole("button", { name: "Undo theme" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Undo" })).toBeNull();
  });

  it("resets to the theme", async () => {
    const user = userEvent.setup();
    const custom = { ...themeLook("paper", "links"), font: "typewriter" as const };
    render(<Harness type="links" initial={{ ...PAGE_DEFAULTS.links(), look: custom }} />);
    await user.click(screen.getByRole("button", { name: "Reset to theme" }));
    expect(look().font).toBe("clean");
  });

  it("says to add a photo to use Hero", () => {
    render(<Harness type="links" initial={PAGE_DEFAULTS.links()} />);
    expect(screen.getByText("Add a photo to use Hero")).toBeInTheDocument();
  });

  it("moves social icons under the header or to the bottom", async () => {
    const user = userEvent.setup();
    render(<Harness type="vcard" initial={PAGE_DEFAULTS.vcard()} />);
    await user.click(screen.getByRole("radio", { name: "Under the header" }));
    expect(look().socials).toBe("top");
  });

  it("switches wallpaper kinds without ever leaving a broken wallpaper", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        type="links"
        initial={{ ...PAGE_DEFAULTS.links(), look: themeLook("paper", "links") }}
      />,
    );
    await user.click(screen.getByRole("radio", { name: "Gradient" }));
    expect(look().wallpaper).toMatchObject({ kind: "gradient", from: "#F6F5F1" });
    await user.click(screen.getByRole("radio", { name: "Photo" }));
    // No photo yet: the gradient stays.
    expect(look().wallpaper.kind).toBe("gradient");
    await user.click(screen.getByRole("radio", { name: "Color" }));
    expect(look().wallpaper).toEqual({ kind: "solid", color: "#F6F5F1" });
  });

  it("uses an uploaded photo with its average color, and darkens it", async () => {
    const user = userEvent.setup();
    const image = { path: `${UID}/w.jpg`, name: "w.jpg", type: "image/jpeg", size: 1 };
    vi.mocked(uploadMedia).mockResolvedValue({ ok: true, media: image });
    const { container } = render(<Harness type="links" initial={PAGE_DEFAULTS.links()} />);
    await user.click(screen.getByRole("radio", { name: "Photo" }));
    await user.upload(fileInput(container), new File(["x"], "w.jpg", { type: "image/jpeg" }));
    expect(look().wallpaper).toEqual({ kind: "image", image, dim: 30, color: "#F3E8D8" });
    fireEvent.change(screen.getByLabelText("Darken"), { target: { value: "60" } });
    expect(look().wallpaper.dim).toBe(60);
  });

  it("keeps the wallpaper when a photo can't be uploaded, and says why", async () => {
    const user = userEvent.setup();
    vi.mocked(uploadMedia).mockResolvedValue({ ok: false, error: "That image couldn't be read." });
    const { container } = render(<Harness type="links" initial={PAGE_DEFAULTS.links()} />);
    const before = look().wallpaper;
    await user.click(screen.getByRole("radio", { name: "Photo" }));
    await user.upload(fileInput(container), new File(["x"], "w.jpg", { type: "image/jpeg" }));
    expect(look().wallpaper).toEqual(before);
    expect(screen.getByText("That image couldn't be read.")).toBeInTheDocument();
  });

  it("keeps edits made while a photo uploads", async () => {
    const user = userEvent.setup();
    const finish = slowUpload();
    const { container } = render(<Harness type="links" initial={PAGE_DEFAULTS.links()} />);
    await user.click(screen.getByRole("radio", { name: "Photo" }));
    await user.upload(fileInput(container), new File(["x"], "w.jpg", { type: "image/jpeg" }));
    await user.click(screen.getByRole("radio", { name: "Typewriter" }));
    await user.click(screen.getByRole("button", { name: "Edit title" }));
    await finish({ ok: true, media: IMAGE });
    expect(look()).toMatchObject({
      font: "typewriter",
      wallpaper: { kind: "image", image: IMAGE },
    });
    expect(title()).toBe("Edited");
  });

  it("drops a photo still uploading when another wallpaper is picked", async () => {
    const user = userEvent.setup();
    const finish = slowUpload();
    const { container } = render(<Harness type="links" initial={PAGE_DEFAULTS.links()} />);
    await user.click(screen.getByRole("radio", { name: "Photo" }));
    await user.upload(fileInput(container), new File(["x"], "w.jpg", { type: "image/jpeg" }));
    await user.click(screen.getByRole("radio", { name: "Color" }));
    const solid = look().wallpaper;
    expect(solid.kind).toBe("solid");
    await finish({ ok: true, media: IMAGE });
    expect(look().wallpaper).toEqual(solid);
  });

  it("undoes only the look, keeping content edited since the theme pick", async () => {
    const user = userEvent.setup();
    render(<Harness type="links" initial={PAGE_DEFAULTS.links()} />);
    await user.click(screen.getByRole("radio", { name: "Ocean" }));
    await user.click(screen.getByRole("button", { name: "Edit title" }));
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(look().theme).toBe("ziplume");
    expect(title()).toBe("Edited");
  });

  it("only applies a custom color once it's complete", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        type="links"
        initial={{ ...PAGE_DEFAULTS.links(), look: themeLook("paper", "links") }}
      />,
    );
    await user.click(screen.getByRole("radio", { name: "Custom text color" }));
    const field = screen.getByLabelText("Text color");
    await user.clear(field);
    // The field puts the # in itself.
    await user.type(field, "12");
    expect(field).toHaveValue("#12");
    expect(look().text).not.toBe("#12");
    await user.type(field, "3456");
    expect(look().text).toBe("#123456");
  });

  it("warns under a hard-to-read choice and fixes it in one click", async () => {
    const user = userEvent.setup();
    const pale = { ...themeLook("paper", "links"), text: "#DDDDDD" };
    render(<Harness type="links" initial={{ ...PAGE_DEFAULTS.links(), look: pale }} />);
    expect(screen.getByText(/Text is hard to read on this wallpaper/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Use Auto" }));
    expect(look().text).toBe("auto");
    expect(screen.queryByText(/Text is hard to read/)).toBeNull();
  });

  it("warns under Wallpaper when Auto text can't read on it, and fixes the wallpaper", async () => {
    const user = userEvent.setup();
    const violet = {
      ...themeLook("paper", "links"),
      wallpaper: { kind: "solid" as const, color: "#8B5CF6" },
    };
    render(<Harness type="links" initial={{ ...PAGE_DEFAULTS.links(), look: violet }} />);
    const wallpaper = within(screen.getByRole("region", { name: "Wallpaper" }));
    expect(wallpaper.getByText("Text is hard to read on this wallpaper.")).toBeInTheDocument();
    // Not under Text, where Auto is already on.
    const text = within(screen.getByRole("region", { name: "Text" }));
    expect(text.queryByRole("button", { name: "Use Auto" })).toBeNull();
    await user.click(wallpaper.getByRole("button", { name: "Adjust the wallpaper" }));
    expect(look().wallpaper.color).not.toBe("#8B5CF6");
    expect(screen.queryByText(/hard to read/)).toBeNull();
  });

  it("sets the font and every button setting", async () => {
    const user = userEvent.setup();
    render(<Harness type="links" initial={PAGE_DEFAULTS.links()} />);
    await user.click(screen.getByRole("radio", { name: "Elegant" }));
    await user.click(screen.getByRole("radio", { name: "Square" }));
    await user.click(screen.getByRole("radio", { name: "Outline" }));
    await user.click(screen.getByRole("radio", { name: "Hard" }));
    expect(look()).toMatchObject({
      font: "elegant",
      button: { shape: "square", style: "outline", shadow: "hard" },
    });
  });
});
