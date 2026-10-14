import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "./AppShell";
import type { ShellTeam } from "./nav";

let pathname = "/codes";
let search = new URLSearchParams();
vi.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSearchParams: () => search,
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const USER = { id: "u1", email: "david@example.com", name: "David Allmon", avatarUrl: null };
const EDITOR: ShellTeam = { ownerId: "t1", label: "Cafe", role: "editor", avatarUrl: null };
const VIEWER: ShellTeam = { ownerId: "t2", label: "Bakery", role: "viewer", avatarUrl: null };

const shell = () => (
  <AppShell user={USER} teams={[EDITOR, VIEWER]}>
    <h1>Page</h1>
  </AppShell>
);

function renderShell() {
  return render(shell());
}

const hrefs = (name: string | RegExp) =>
  screen.getAllByRole("link", { name }).map((link) => link.getAttribute("href"));

beforeEach(() => {
  pathname = "/codes";
  search = new URLSearchParams();
});

describe("AppShell", () => {
  it("links every section, keeping the team you're looking at", () => {
    search = new URLSearchParams("workspace=t1");
    renderShell();
    expect(new Set(hrefs("Codes"))).toEqual(new Set(["/codes?workspace=t1"]));
    expect(new Set(hrefs(/^Create( code)?$/))).toEqual(new Set(["/?workspace=t1"]));
    expect(new Set(hrefs("Team"))).toEqual(new Set(["/team"]));
    expect(hrefs("Settings")).toContain("/settings");
    expect(hrefs("Help & API docs")).toEqual(["/developers"]);
    expect(screen.getByRole("link", { name: "Support QuickQReate" })).toHaveAttribute(
      "href",
      "https://buymeacoffee.com/davidallmon",
    );
  });

  it("marks the current page", () => {
    pathname = "/team";
    renderShell();
    for (const link of screen.getAllByRole("link", { name: "Team" })) {
      expect(link).toHaveAttribute("aria-current", "page");
    }
    for (const link of screen.getAllByRole("link", { name: "Codes" })) {
      expect(link).not.toHaveAttribute("aria-current");
    }
  });

  it("viewers can't create", () => {
    search = new URLSearchParams("workspace=t2");
    renderShell();
    expect(screen.queryAllByRole("link", { name: /^Create( code)?$/ })).toEqual([]);
  });

  it("switches between your codes and your teams' codes", async () => {
    renderShell();
    await userEvent.click(screen.getAllByRole("button", { name: /Switch team/ })[0]!);
    const menu = screen.getByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: /My codes/ })).toHaveAttribute(
      "href",
      "/codes",
    );
    expect(within(menu).getByRole("menuitem", { name: /Cafe’s codes/ })).toHaveAttribute(
      "href",
      "/codes?workspace=t1",
    );
  });

  it("expands and collapses the tablet rail", async () => {
    renderShell();
    const toggle = screen.getByRole("button", { name: "Expand menu" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(screen.getByRole("button", { name: "Collapse menu" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("collapses the tablet rail when the page changes, and on Escape", async () => {
    const { rerender } = renderShell();
    await userEvent.click(screen.getByRole("button", { name: "Expand menu" }));
    pathname = "/team";
    rerender(shell());
    expect(screen.getByRole("button", { name: "Expand menu" })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    await userEvent.click(screen.getByRole("button", { name: "Expand menu" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("button", { name: "Expand menu" })).toHaveFocus();
  });

  it("lets keyboard users change the theme without opening a menu", () => {
    renderShell();
    expect(screen.getAllByRole("radio", { name: "Dark theme" }).length).toBeGreaterThan(0);
  });

  it("puts settings, help, support and sign out under More on phones", async () => {
    renderShell();
    await userEvent.click(screen.getByRole("button", { name: "More" }));
    const sheet = screen.getByRole("dialog", { name: "More" });
    for (const name of ["Settings", "Help & API docs", "Support QuickQReate"]) {
      expect(within(sheet).getByRole("link", { name })).toBeInTheDocument();
    }
    expect(within(sheet).getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});
