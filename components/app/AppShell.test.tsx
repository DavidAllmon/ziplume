import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShell } from "./AppShell";
import type { ShellTeam } from "./nav";

let pathname = "/codes";
let search = new URLSearchParams();
// The folder list loads from Supabase; the tests only need to see whether it's there.
vi.mock("./FolderNav", () => ({ FolderNav: () => <p>Folder list</p> }));
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
  it("opens bulk creation inside the app, in the folder being viewed", async () => {
    const user = userEvent.setup();
    search = new URLSearchParams("folder=f1");
    renderShell();
    await user.click(screen.getAllByRole("button", { name: "More ways to create" })[0]!);
    expect(
      await screen.findByRole("menuitem", { name: /Bulk create from a spreadsheet/ }),
    ).toHaveAttribute("href", "/codes/bulk?folder=f1");
  });

  it("creates in the folder being viewed", () => {
    search = new URLSearchParams("folder=f1");
    renderShell();
    expect(new Set(hrefs(/^Create( code)?$/))).toEqual(new Set(["/codes/new?folder=f1"]));
  });

  it("doesn't create in a teammate's folder", () => {
    search = new URLSearchParams("workspace=t1&folder=f1");
    renderShell();
    expect(new Set(hrefs(/^Create( code)?$/))).toEqual(new Set(["/codes/new"]));
  });

  it("ignores a folder outside the codes list", () => {
    pathname = "/team";
    search = new URLSearchParams("folder=f1");
    renderShell();
    expect(new Set(hrefs(/^Create( code)?$/))).toEqual(new Set(["/codes/new"]));
  });

  it("links every section, keeping the team you're looking at", () => {
    search = new URLSearchParams("workspace=t1");
    renderShell();
    expect(new Set(hrefs("Codes"))).toEqual(new Set(["/codes?workspace=t1"]));
    // Creating always happens in your own codes, whoever's codes you're looking at.
    expect(new Set(hrefs(/^Create( code)?$/))).toEqual(new Set(["/codes/new"]));
    expect(new Set(hrefs("Team"))).toEqual(new Set(["/team"]));
    expect(hrefs("Settings")).toContain("/settings");
    expect(hrefs("Help & API docs")).toEqual(["/developers"]);
    expect(screen.getByRole("link", { name: "Support Ziplume" })).toHaveAttribute(
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

  it("everyone creates their own codes, even while viewing a teammate's", () => {
    search = new URLSearchParams("workspace=t2");
    renderShell();
    expect(new Set(hrefs(/^Create( code)?$/))).toEqual(new Set(["/codes/new"]));
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

  it("offers Everyone in the switcher, keeps it in the Codes link, and hides folders there", async () => {
    search = new URLSearchParams("view=everyone");
    renderShell();
    const switcher = screen.getAllByRole("button", { name: /Switch team/ })[0]!;
    expect(switcher).toHaveAccessibleName("Switch team (showing Everyone’s codes)");
    expect(hrefs("Codes")).toContain("/codes?view=everyone");
    expect(screen.queryByText("Folder list")).toBeNull();
    await userEvent.click(switcher);
    expect(
      within(screen.getByRole("menu")).getByRole("menuitem", { name: /Everyone’s codes/ }),
    ).toHaveAttribute("href", "/codes?view=everyone");
  });

  it("shows no Everyone to someone on their own", async () => {
    search = new URLSearchParams("view=everyone");
    render(
      <AppShell user={USER} teams={[]}>
        <h1>Page</h1>
      </AppShell>,
    );
    expect(screen.getAllByText("Folder list").length).toBeGreaterThan(0);
    await userEvent.click(screen.getAllByRole("button", { name: /Switch team/ })[0]!);
    expect(
      within(screen.getByRole("menu")).queryByRole("menuitem", { name: /Everyone/ }),
    ).toBeNull();
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

  it("draws the sidebar in the navy sidebar palette", () => {
    renderShell();
    expect(screen.getByRole("complementary", { name: "Sidebar" })).toHaveAttribute(
      "data-surface",
      "sidebar",
    );
  });

  it("puts settings, help, support and sign out under More on phones", async () => {
    renderShell();
    await userEvent.click(screen.getByRole("button", { name: "More" }));
    const sheet = screen.getByRole("dialog", { name: "More" });
    for (const name of ["Settings", "Help & API docs", "Support Ziplume"]) {
      expect(within(sheet).getByRole("link", { name })).toBeInTheDocument();
    }
    expect(within(sheet).getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("gives the editor the whole phone screen: no top bar or bottom tabs", () => {
    pathname = "/codes/new";
    search = new URLSearchParams("type=links");
    const { container } = renderShell();
    expect(container.querySelector("[data-tabbar]")).toBeNull();
    expect(container.querySelector("header")).toBeNull();
    expect(container.querySelector("[data-app-shell]")).toHaveAttribute("data-editor");
  });

  it("keeps the phone bars on the type gallery and on every other page", () => {
    pathname = "/codes/new";
    const { container } = renderShell();
    expect(container.querySelector("[data-tabbar]")).not.toBeNull();
    expect(container.querySelector("header")).not.toBeNull();
    expect(container.querySelector("[data-app-shell]")).not.toHaveAttribute("data-editor");
  });
});

describe("Templates in the navigation", () => {
  it("is in the sidebar after Codes, and in More on phones", async () => {
    const user = userEvent.setup();
    renderShell();
    const sidebar = within(screen.getByRole("complementary", { name: "Sidebar" }));
    expect(sidebar.getByRole("link", { name: "Templates" })).toHaveAttribute("href", "/templates");
    await user.click(screen.getByRole("button", { name: "More" }));
    expect(
      within(screen.getByRole("dialog", { name: "More" })).getByRole("link", { name: "Templates" }),
    ).toHaveAttribute("href", "/templates");
  });
});
