import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFolder } from "@/features/folders/api";

import { FolderNav } from "./FolderNav";

const push = vi.fn();
let search = new URLSearchParams();
vi.mock("next/navigation", () => ({
  usePathname: () => "/codes",
  useSearchParams: () => search,
  useRouter: () => ({ push, refresh: vi.fn() }),
}));
vi.mock("@/features/folders/api", () => ({ createFolder: vi.fn(), MAX_FOLDER_NAME: 60 }));
vi.mock("@/lib/supabase/client", () => ({
  getBrowserSupabase: () => ({
    from: (table: string) => ({
      select: () => ({
        eq: () =>
          table === "folders"
            ? { order: async () => ({ data: [{ id: "f1", name: "Flyers" }] }) }
            : Promise.resolve({
                data: [{ folder_id: "f1" }, { folder_id: null }, { folder_id: "f1" }],
              }),
      }),
    }),
  }),
}));

beforeEach(() => {
  search = new URLSearchParams();
  push.mockReset();
});

describe("FolderNav", () => {
  it("lists all codes and each folder with counts, keeping the team", async () => {
    render(<FolderNav ownerId="t1" teamId="t1" canEdit expanded onNavigate={() => {}} />);
    const all = await screen.findByRole("link", { name: /All codes/ });
    expect(all).toHaveAttribute("href", "/codes?workspace=t1");
    expect(all).toHaveTextContent("3");
    const flyers = screen.getByRole("link", { name: /Flyers/ });
    expect(flyers).toHaveAttribute("href", "/codes?folder=f1&workspace=t1");
    expect(flyers).toHaveTextContent("2");
  });

  it("marks the folder being shown", async () => {
    search = new URLSearchParams("folder=f1");
    render(<FolderNav ownerId="u1" teamId={null} canEdit expanded onNavigate={() => {}} />);
    expect(await screen.findByRole("link", { name: /Flyers/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("link", { name: /All codes/ })).not.toHaveAttribute("aria-current");
  });

  it("creates a folder and opens it", async () => {
    vi.mocked(createFolder).mockResolvedValue({
      ok: true,
      value: { id: "f2", user_id: "u1", name: "Menus", created_at: "", updated_at: "" },
    });
    render(<FolderNav ownerId="u1" teamId={null} canEdit expanded onNavigate={() => {}} />);
    await userEvent.click(await screen.findByRole("button", { name: "New folder" }));
    await userEvent.type(screen.getByLabelText("Folder name"), "Menus");
    await userEvent.click(screen.getByRole("button", { name: "Create folder" }));
    expect(createFolder).toHaveBeenCalledWith("u1", "Menus");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/codes?folder=f2"));
  });

  it("viewers see folders but can't add one", async () => {
    render(<FolderNav ownerId="t1" teamId="t1" canEdit={false} expanded onNavigate={() => {}} />);
    await screen.findByRole("link", { name: /Flyers/ });
    expect(screen.queryByRole("button", { name: "New folder" })).toBeNull();
  });
});
