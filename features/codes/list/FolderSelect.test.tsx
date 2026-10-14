import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createFolder } from "@/features/folders/api";
import type { FolderRow } from "@/types/supabase";

import { FolderSelect } from "./FolderSelect";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));
vi.mock("@/features/folders/api", () => ({ createFolder: vi.fn(), MAX_FOLDER_NAME: 60 }));

const FLYERS = {
  id: "f1",
  user_id: "t1",
  name: "Flyers",
  created_at: "",
  updated_at: "",
} as FolderRow;

beforeEach(() => push.mockReset());

describe("FolderSelect (phones)", () => {
  it("opens a folder, keeping the team", async () => {
    render(<FolderSelect folders={[FLYERS]} current={null} ownerId="t1" teamId="t1" canEdit />);
    await userEvent.selectOptions(screen.getByLabelText("Folder"), "f1");
    expect(push).toHaveBeenCalledWith("/codes?folder=f1&workspace=t1");
    await userEvent.selectOptions(screen.getByLabelText("Folder"), "");
    expect(push).toHaveBeenCalledWith("/codes?workspace=t1");
  });

  it("creates a folder and opens it", async () => {
    vi.mocked(createFolder).mockResolvedValue({
      ok: true,
      value: { ...FLYERS, id: "f2", name: "Menus" },
    });
    render(<FolderSelect folders={[FLYERS]} current="f1" ownerId="u1" teamId={null} canEdit />);
    await userEvent.click(screen.getByRole("button", { name: "New folder" }));
    await userEvent.type(screen.getByLabelText("Folder name"), "Menus");
    await userEvent.click(screen.getByRole("button", { name: "Create folder" }));
    expect(createFolder).toHaveBeenCalledWith("u1", "Menus");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/codes?folder=f2"));
  });

  it("viewers can open folders but not add one", () => {
    render(
      <FolderSelect folders={[FLYERS]} current={null} ownerId="t1" teamId="t1" canEdit={false} />,
    );
    expect(screen.getByLabelText("Folder")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "New folder" })).toBeNull();
  });
});
