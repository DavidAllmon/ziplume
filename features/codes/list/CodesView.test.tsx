import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import { deleteCode, updateCode } from "@/features/codes/api";
import type { QrCodeRow } from "@/types/supabase";

import { CodesView } from "./CodesView";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/features/codes/api", () => ({
  updateCode: vi.fn(),
  deleteCode: vi.fn(),
  duplicateCode: vi.fn(),
}));
vi.mock("@/features/folders/api", () => ({ moveCodes: vi.fn() }));
vi.mock("@/features/generator/preview/QrTile", () => ({ QrTile: () => <span /> }));

function code(id: string, patch: Partial<QrCodeRow> = {}): QrCodeRow {
  return {
    id,
    user_id: "owner",
    name: id,
    qr_type: "url",
    content: { url: `https://example.com/${id}` },
    design: {},
    is_dynamic: true,
    slug: `SLUG${id.toUpperCase()}`,
    destination: `https://example.com/${id}`,
    status: "active",
    scan_count: 0,
    last_scanned_at: null,
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    folder_id: null,
    active_from: null,
    active_until: null,
    has_password: false,
    ...patch,
  } as QrCodeRow;
}

const MENU = code("menu", { name: "Spring menu" });
const FLYER = code("flyer", { name: "Old flyer", status: "paused" });
const WIFI = code("wifi", {
  name: "Front desk",
  qr_type: "wifi",
  is_dynamic: false,
  slug: null,
  destination: null,
  content: { ssid: "Guest", password: "x", security: "WPA", hidden: false },
});

function renderView(props: Partial<ComponentProps<typeof CodesView>> = {}) {
  return render(
    <ToastProvider>
      <CodesView
        userId="owner"
        codes={[MENU, FLYER, WIFI]}
        folders={[]}
        folder={null}
        ownerId="owner"
        teamId={null}
        canEdit
        recentScans={{ menu: 12 }}
        {...props}
      />
    </ToastProvider>,
  );
}

const rowFor = (name: string) => screen.getByRole("listitem", { name });

beforeEach(() => {
  window.localStorage.clear();
  vi.mocked(updateCode).mockReset();
  vi.mocked(deleteCode).mockReset();
});

describe("CodesView", () => {
  it("shows one status, the short link or content, and 30-day scans per code", () => {
    renderView();
    // Each row has the pill twice: in the phone line and in the wide-screen column.
    expect(within(rowFor("Spring menu")).getAllByText("Active").length).toBeGreaterThan(0);
    expect(within(rowFor("Spring menu")).getByText(/r\/SLUGMENU/)).toBeInTheDocument();
    expect(within(rowFor("Spring menu")).getAllByText("12").length).toBeGreaterThan(0);
    expect(within(rowFor("Old flyer")).getAllByText("Paused").length).toBeGreaterThan(0);
    expect(within(rowFor("Front desk")).getAllByText("Static").length).toBeGreaterThan(0);
  });

  it("filters by status, and offers to clear filters that match nothing", async () => {
    renderView();
    await userEvent.selectOptions(screen.getByLabelText("Status"), "expired");
    expect(screen.getByText("No codes match")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(rowFor("Spring menu")).toBeInTheDocument();
  });

  it("remembers grid view for this person only", async () => {
    const first = renderView();
    await userEvent.click(screen.getByRole("radio", { name: "Grid view" }));
    expect(screen.getByRole("list", { name: "Codes" })).toHaveAttribute("data-view", "grid");
    first.unmount();
    const second = renderView();
    expect(screen.getByRole("list", { name: "Codes" })).toHaveAttribute("data-view", "grid");
    second.unmount();
    renderView({ userId: "someone-else" });
    expect(screen.getByRole("list", { name: "Codes" })).toHaveAttribute("data-view", "list");
  });

  it("pauses and deletes only the selected codes", async () => {
    vi.mocked(updateCode).mockImplementation(async (id) => ({
      ok: true,
      value: { ...MENU, id, status: "paused" },
    }));
    vi.mocked(deleteCode).mockResolvedValue({ ok: true, value: null });
    renderView();
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Spring menu" }));
    const bar = screen.getByRole("region", { name: "Selected codes" });
    expect(within(bar).getByText("1 selected")).toBeInTheDocument();
    await userEvent.click(within(bar).getByRole("button", { name: "Pause" }));
    expect(updateCode).toHaveBeenCalledTimes(1);
    expect(updateCode).toHaveBeenCalledWith("menu", { status: "paused" });
    await userEvent.click(within(bar).getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete 1 code" }));
    expect(deleteCode).toHaveBeenCalledTimes(1);
    expect(deleteCode).toHaveBeenCalledWith("menu");
    expect(screen.queryByRole("listitem", { name: "Spring menu" })).toBeNull();
    expect(rowFor("Old flyer")).toBeInTheDocument();
  });

  it("viewers can open and download but not change codes", async () => {
    renderView({ canEdit: false });
    await userEvent.click(screen.getByRole("button", { name: "Actions for Spring menu" }));
    const menu = screen.getByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: "Open" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Download PNG" })).toBeInTheDocument();
    for (const name of ["Duplicate", "Move to folder", "Pause", "Delete"]) {
      expect(within(menu).queryByRole("menuitem", { name })).toBeNull();
    }
    await userEvent.keyboard("{Escape}");
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Spring menu" }));
    const bar = screen.getByRole("region", { name: "Selected codes" });
    expect(within(bar).getByRole("button", { name: "Download ZIP" })).toBeInTheDocument();
    for (const name of ["Move", "Pause", "Delete"]) {
      expect(within(bar).queryByRole("button", { name })).toBeNull();
    }
  });

  it("welcomes a first-time user with quick starts", () => {
    renderView({ codes: [] });
    expect(screen.getByRole("heading", { name: "Create your first QR code" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Wi-Fi/ })).toHaveAttribute("href", "/?type=wifi");
  });

  it("says when a folder is empty", () => {
    renderView({
      codes: [],
      folder: {
        id: "f1",
        user_id: "owner",
        name: "Flyers",
        created_at: "2026-10-01T00:00:00Z",
        updated_at: "2026-10-01T00:00:00Z",
      },
    });
    expect(screen.getByRole("heading", { name: "This folder is empty" })).toBeInTheDocument();
  });
});
