import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import { deleteCodes, duplicateCode, setCodesStatus } from "@/features/codes/api";
import type { QrCodeRow } from "@/types/supabase";

import { copyCodeMedia } from "@/features/codes/copyMedia";

import { CodesView } from "./CodesView";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("@/features/codes/api", () => ({
  updateCode: vi.fn(),
  deleteCode: vi.fn(),
  duplicateCode: vi.fn(),
  setCodesStatus: vi.fn(),
  deleteCodes: vi.fn(),
}));

/** A promise the test resolves when it wants the "network" to answer. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}
vi.mock("@/features/folders/api", () => ({ moveCodes: vi.fn() }));
vi.mock("@/features/codes/copyMedia", () => ({ copyCodeMedia: vi.fn() }));
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
  vi.mocked(setCodesStatus).mockReset();
  vi.mocked(deleteCodes).mockReset();
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

  it("pauses the selected trackable codes in one go, showing it's working", async () => {
    const pending = deferred<Awaited<ReturnType<typeof setCodesStatus>>>();
    vi.mocked(setCodesStatus).mockReturnValue(pending.promise);
    renderView();
    await userEvent.click(screen.getByRole("checkbox", { name: "Select all shown" }));
    const bar = screen.getByRole("region", { name: "Selected codes" });
    expect(within(bar).getByText("3 selected")).toBeInTheDocument();
    await userEvent.click(within(bar).getByRole("button", { name: "Pause" }));
    expect(within(bar).getByText("Pausing 2 of 2…")).toBeInTheDocument();
    expect(within(bar).getByRole("button", { name: "Pause" })).toBeDisabled();
    await userEvent.click(within(bar).getByRole("button", { name: "Pause" }));
    expect(setCodesStatus).toHaveBeenCalledTimes(1);
    expect(setCodesStatus).toHaveBeenCalledWith(["menu", "flyer"], "paused");
    pending.resolve({
      ok: true,
      value: [
        { ...MENU, status: "paused" },
        { ...FLYER, status: "paused" },
      ],
    });
    await waitFor(() =>
      expect(within(rowFor("Spring menu")).getAllByText("Paused").length).toBeGreaterThan(0),
    );
  });

  it("deletes exactly the selected codes, and can't be cancelled halfway", async () => {
    const pending = deferred<Awaited<ReturnType<typeof deleteCodes>>>();
    vi.mocked(deleteCodes).mockReturnValue(pending.promise);
    renderView();
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Spring menu" }));
    await userEvent.click(screen.getByRole("checkbox", { name: "Select Front desk" }));
    const bar = screen.getByRole("region", { name: "Selected codes" });
    await userEvent.click(within(bar).getByRole("button", { name: "Delete" }));
    await userEvent.click(screen.getByRole("button", { name: "Delete 2 codes" }));
    expect(deleteCodes).toHaveBeenCalledWith(["menu", "wifi"]);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    await userEvent.keyboard("{Escape}");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    pending.resolve({ ok: true, value: ["menu", "wifi"] });
    await waitFor(() => expect(screen.queryByRole("listitem", { name: "Spring menu" })).toBeNull());
    expect(screen.queryByRole("listitem", { name: "Front desk" })).toBeNull();
    expect(rowFor("Old flyer")).toBeInTheDocument();
    expect(deleteCodes).toHaveBeenCalledTimes(1);
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

  it("a teammate's code is copied into your own codes", async () => {
    const user = userEvent.setup();
    vi.mocked(duplicateCode).mockResolvedValue({
      ok: true,
      value: { ...MENU, id: "copy", name: "Copy of Spring menu" },
    });
    renderView({ teamId: "kim" });
    await user.click(screen.getAllByRole("button", { name: "Actions for Spring menu" })[0]!);
    await user.click(screen.getByRole("menuitem", { name: /Duplicate/ }));
    expect(duplicateCode).toHaveBeenCalledWith(expect.objectContaining({ name: "Spring menu" }), {
      keepFolder: false,
    });
    expect(await screen.findByText("Copied “Spring menu” to your codes")).toBeInTheDocument();
    expect(screen.queryByText("Copy of Spring menu")).toBeNull();
  });

  it("a teammate's hosted page is copied with its images, into your own codes", async () => {
    const user = userEvent.setup();
    const page = code("links", {
      name: "Team links",
      qr_type: "links",
      destination: null,
      content: {
        title: "Links",
        logo: { path: "kim/a.png", name: "a.png", type: "image/png", size: 1 },
      },
    });
    vi.mocked(copyCodeMedia).mockResolvedValue({ ok: true, content: { title: "Links (copied)" } });
    vi.mocked(duplicateCode).mockResolvedValue({ ok: true, value: { ...page, id: "copy" } });
    renderView({ teamId: "kim", codes: [page] });
    await user.click(screen.getAllByRole("button", { name: "Actions for Team links" })[0]!);
    await user.click(screen.getByRole("menuitem", { name: /Duplicate/ }));
    expect(copyCodeMedia).toHaveBeenCalledWith("links");
    expect(duplicateCode).toHaveBeenCalledWith(
      expect.objectContaining({ content: { title: "Links (copied)" } }),
      { keepFolder: false },
    );
  });

  it("welcomes a first-time user with quick starts", () => {
    renderView({ codes: [] });
    expect(screen.getByRole("heading", { name: "Create your first QR code" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Wi-Fi/ })).toHaveAttribute(
      "href",
      "/codes/new?type=wifi",
    );
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
    expect(screen.getByRole("link", { name: "Create a code here" })).toHaveAttribute(
      "href",
      "/codes/new?folder=f1",
    );
  });
});
