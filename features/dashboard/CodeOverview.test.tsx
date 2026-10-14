import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import { copyToMyCodes } from "@/features/codes/duplicate";
import { savedRow } from "@/features/create/fixtures";
import type { FolderRow, QrCodeRow } from "@/types/supabase";

import { activeWindow, CodeOverview } from "./CodeOverview";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh: vi.fn(), replace: vi.fn() }),
}));
vi.mock("@/features/codes/api", () => ({ updateCode: vi.fn(), deleteCode: vi.fn() }));
vi.mock("@/features/codes/duplicate", () => ({ copyToMyCodes: vi.fn() }));
vi.mock("@/features/folders/api", () => ({ moveCodes: vi.fn() }));
vi.mock("@/features/generator/preview/QrTile", () => ({ QrTile: () => <div /> }));
vi.mock("@/features/generator/export/ExportPanel", () => ({ ExportPanel: () => null }));

const FOLDERS = [{ id: "f1", name: "Flyers" }] as FolderRow[];

function renderOverview(code: QrCodeRow, canEdit = true, fromTeammate = false) {
  return render(
    <ToastProvider>
      <CodeOverview
        code={code}
        canEdit={canEdit}
        folders={FOLDERS}
        back={{ href: "/codes", label: "All codes" }}
        editHref="/codes/c1/edit"
        fromTeammate={fromTeammate}
      />
    </ToastProvider>,
  );
}

beforeEach(() => push.mockReset());

describe("CodeOverview", () => {
  it("shows a trackable link at a glance, with Edit code for editors", () => {
    renderOverview(savedRow({ has_password: true, folder_id: "f1" }));
    expect(screen.getByRole("link", { name: /Edit code/ })).toHaveAttribute(
      "href",
      "/codes/c1/edit",
    );
    expect(screen.getByText("https://example.com/menu")).toBeInTheDocument();
    expect(screen.getByText("Password protected")).toBeInTheDocument();
    expect(screen.getByText("Always")).toBeInTheDocument();
    expect(screen.getByText("Flyers")).toBeInTheDocument();
    expect(screen.queryByLabelText("Destination URL")).toBeNull();
    expect(screen.queryByLabelText("Name")).toBeNull();
  });

  it("lets a viewer look but not change anything", () => {
    renderOverview(savedRow(), false, true);
    expect(screen.queryByRole("link", { name: /Edit code/ })).toBeNull();
    expect(screen.getByText(/You can view this code but not change it/)).toBeInTheDocument();
    for (const name of [/Duplicate/, /Move to folder/, /Delete/]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
    expect(screen.getByRole("switch", { name: "Active" })).toBeDisabled();
  });

  it("summarizes a static code's content and has no access card", () => {
    renderOverview(
      savedRow({
        qr_type: "text",
        is_dynamic: false,
        slug: null,
        destination: null,
        content: { text: "Hello" },
      }),
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.queryByText("Password protected")).toBeNull();
    expect(screen.queryByText("No password")).toBeNull();
  });

  it("duplicates into your codes and opens the copy", async () => {
    vi.mocked(copyToMyCodes).mockResolvedValue({
      ok: true,
      value: savedRow({ id: "c2", name: "Copy of Spring menu" }),
    });
    renderOverview(savedRow());
    await userEvent.click(screen.getByRole("button", { name: /Duplicate/ }));
    expect(copyToMyCodes).toHaveBeenCalledWith(expect.objectContaining({ id: "c1" }), {
      fromTeammate: false,
    });
    await waitFor(() => expect(push).toHaveBeenCalledWith("/codes/c2"));
  });
});

describe("activeWindow", () => {
  const fmt = (iso: string) => iso.slice(0, 10);
  it("puts the active dates in words", () => {
    expect(activeWindow(null, null, fmt)).toBe("Always");
    expect(activeWindow("2030-01-01T00:00:00Z", null, fmt)).toBe("From 2030-01-01");
    expect(activeWindow(null, "2030-02-01T00:00:00Z", fmt)).toBe("Until 2030-02-01");
    expect(activeWindow("2030-01-01T00:00:00Z", "2030-02-01T00:00:00Z", fmt)).toBe(
      "2030-01-01 to 2030-02-01",
    );
  });
});
