import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import type { DesignTemplateRow } from "@/types/supabase";

import { deleteTemplate, duplicateTemplate, renameTemplate, setDefaultTemplate } from "./api";
import { TemplatesPage } from "./TemplatesPage";

vi.mock("./api", () => ({
  setDefaultTemplate: vi.fn(async () => ({ ok: true, value: null })),
  renameTemplate: vi.fn(),
  duplicateTemplate: vi.fn(),
  deleteTemplate: vi.fn(async () => ({ ok: true, value: null })),
}));
vi.mock("@/features/generator/preview/QrView", () => ({ QrView: () => null }));
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

const row = (id: string, name: string, isDefault = false) =>
  ({
    id,
    user_id: "u1",
    name,
    design: {},
    is_default: isDefault,
    created_at: "",
    updated_at: "",
  }) as DesignTemplateRow;
const show = (templates: DesignTemplateRow[]) =>
  render(
    <ToastProvider>
      <TemplatesPage templates={templates} />
    </ToastProvider>,
  );
const card = (name: string) => within(screen.getByRole("listitem", { name }));

describe("TemplatesPage", () => {
  beforeEach(() => vi.mocked(setDefaultTemplate).mockClear());

  it("says what to do when there are none", () => {
    show([]);
    expect(screen.getByText(/No templates yet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /New template/ })).toHaveAttribute(
      "href",
      "/templates/new",
    );
  });

  it("marks the default, and moves it when another is set", async () => {
    const user = userEvent.setup();
    show([row("t1", "Brand", true), row("t2", "Party")]);
    expect(card("Brand").getByText("Default")).toBeInTheDocument();
    expect(card("Party").queryByText("Default")).toBeNull();
    await user.click(card("Party").getByRole("button", { name: "Actions for Party" }));
    await user.click(screen.getByRole("menuitem", { name: "Set as default" }));
    expect(setDefaultTemplate).toHaveBeenCalledWith("t2");
    expect(card("Party").getByText("Default")).toBeInTheDocument();
    expect(card("Brand").queryByText("Default")).toBeNull();
    // The default's own menu offers to go back to Classic.
    await user.click(card("Party").getByRole("button", { name: "Actions for Party" }));
    await user.click(screen.getByRole("menuitem", { name: "Stop using as default" }));
    expect(setDefaultTemplate).toHaveBeenLastCalledWith(null);
  });

  it("renames, duplicates and deletes", async () => {
    const user = userEvent.setup();
    vi.mocked(renameTemplate).mockResolvedValue({ ok: true, value: row("t1", "Brand 2") });
    vi.mocked(duplicateTemplate).mockResolvedValue({
      ok: true,
      value: row("t3", "Copy of Brand 2"),
    });
    show([row("t1", "Brand")]);
    await user.click(screen.getByRole("button", { name: "Actions for Brand" }));
    await user.click(screen.getByRole("menuitem", { name: "Rename" }));
    const field = screen.getByRole("textbox", { name: "Name" });
    await user.clear(field);
    await user.type(field, "Brand 2");
    await user.click(screen.getByRole("button", { name: "Rename" }));
    expect(renameTemplate).toHaveBeenCalledWith("t1", "Brand 2");
    expect(await screen.findByRole("listitem", { name: "Brand 2" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Actions for Brand 2" }));
    await user.click(screen.getByRole("menuitem", { name: "Duplicate" }));
    expect(await screen.findByRole("listitem", { name: "Copy of Brand 2" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Actions for Copy of Brand 2" }));
    await user.click(screen.getByRole("menuitem", { name: "Delete" }));
    await user.click(screen.getByRole("button", { name: "Delete template" }));
    expect(deleteTemplate).toHaveBeenCalledWith("t3");
    await vi.waitFor(() =>
      expect(screen.queryByRole("listitem", { name: "Copy of Brand 2" })).toBeNull(),
    );
  });

  it("keeps the default where it was when setting one fails", async () => {
    const user = userEvent.setup();
    vi.mocked(setDefaultTemplate).mockResolvedValueOnce({
      ok: false,
      error: "The default couldn't be changed. Reload and try again.",
    });
    show([row("t1", "Brand", true), row("t2", "Party")]);
    await user.click(card("Party").getByRole("button", { name: "Actions for Party" }));
    await user.click(screen.getByRole("menuitem", { name: "Set as default" }));
    expect(await screen.findByText(/couldn't be changed/)).toBeInTheDocument();
    expect(card("Brand").getByText("Default")).toBeInTheDocument();
  });

  it("refreshes the page's data after each change, so Back can't bring back old cards", async () => {
    const user = userEvent.setup();
    refresh.mockClear();
    vi.mocked(duplicateTemplate).mockResolvedValue({ ok: true, value: row("t3", "Copy of Party") });
    show([row("t1", "Brand", true), row("t2", "Party")]);
    await user.click(card("Party").getByRole("button", { name: "Actions for Party" }));
    await user.click(screen.getByRole("menuitem", { name: "Set as default" }));
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(1));
    await user.click(card("Party").getByRole("button", { name: "Actions for Party" }));
    await user.click(screen.getByRole("menuitem", { name: "Duplicate" }));
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledTimes(2));
  });
});
