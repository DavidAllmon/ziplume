import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import { themeLook } from "@/lib/pages/look";
import { PAGE_DEFAULTS, type PageContentMap } from "@/lib/pages/types";
import type { PageTypeId } from "@/lib/qr/types";

import { LookEditor } from "./LookEditor";

function Harness<K extends PageTypeId>({ type, initial }: { type: K; initial: PageContentMap[K] }) {
  const [page, setPage] = useState(initial);
  return (
    <ToastProvider>
      <LookEditor type={type} page={page} onChange={(next) => setPage(next)} />
      <output aria-label="Look">{JSON.stringify(page.look)}</output>
    </ToastProvider>
  );
}
const look = () => JSON.parse(screen.getByRole("status", { name: "Look" }).textContent!);

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

  it("picks a theme, keeps the header, and undoes the latest pick", async () => {
    const user = userEvent.setup();
    const start = {
      ...PAGE_DEFAULTS.links(),
      look: { ...themeLook("paper", "links"), header: "hero" as const },
    };
    render(<Harness type="links" initial={start} />);
    await user.click(screen.getByRole("radio", { name: "Ocean" }));
    expect(look()).toMatchObject({ theme: "ocean", header: "hero" });
    await user.click(screen.getByRole("radio", { name: "Forest" }));
    await user.click(screen.getAllByRole("button", { name: "Undo" }).at(-1)!);
    expect(look().theme).toBe("ocean");
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
});
