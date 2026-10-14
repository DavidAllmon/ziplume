import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import type * as CodesApi from "@/features/codes/api";
import { createCodes, type NewCode, type Result } from "@/features/codes/api";
import type * as FoldersApi from "@/features/folders/api";
import { createFolder } from "@/features/folders/api";
import type { FolderRow, QrCodeRow } from "@/types/supabase";

import { BulkCreatePage, type BulkCreatePageProps } from "./BulkCreatePage";
import type * as Zip from "./zip";
import { downloadZip } from "./zip";

vi.mock("@/features/codes/api", async (original) => ({
  ...(await original<typeof CodesApi>()),
  createCodes: vi.fn(),
}));
vi.mock("@/features/folders/api", async (original) => ({
  ...(await original<typeof FoldersApi>()),
  createFolder: vi.fn(),
}));
vi.mock("./zip", async (original) => ({ ...(await original<typeof Zip>()), downloadZip: vi.fn() }));

const FOLDERS = [{ id: "f1", name: "Flyers" }] as FolderRow[];
const LINKS = "name,url\nMenu,https://example.com/menu\nMail,mailto:hi@example.com";

/** What the database hands back for each saved input. */
const rowsFor = (inputs: NewCode[]) =>
  inputs.map(
    (input) =>
      ({
        id: `id-${input.name}`,
        name: input.name,
        qr_type: input.qrType,
        content: input.content,
        design: {},
        is_dynamic: Boolean(input.dynamic),
        slug: input.dynamic ? "ABC123" : null,
        destination: input.dynamic?.destination ?? null,
      }) as unknown as QrCodeRow,
  );

/** createCodes that saves everything and reports it as one batch. */
function savesAll() {
  vi.mocked(createCodes).mockImplementation(async (inputs, onProgress) => {
    const rows = rowsFor(inputs);
    onProgress?.(rows.length, rows);
    return { ok: true, value: rows };
  });
}

function renderPage(props: Partial<BulkCreatePageProps> = {}) {
  return render(
    <ToastProvider>
      <BulkCreatePage ownerId="u1" folders={FOLDERS} initialFolderId={null} {...props} />
    </ToastProvider>,
  );
}

const paste = (csv: string) =>
  fireEvent.change(screen.getByLabelText("CSV"), { target: { value: csv } });

beforeEach(() => {
  vi.mocked(createCodes).mockReset();
  vi.mocked(createFolder).mockReset();
  vi.mocked(downloadZip).mockReset();
});

describe("BulkCreatePage", () => {
  it("creates every ready row as a trackable link in the folder it was opened for", async () => {
    const user = userEvent.setup();
    savesAll();
    renderPage({ initialFolderId: "f1" });
    paste(LINKS);
    expect(screen.getByText("1 ready, 1 need fixing.")).toBeInTheDocument();
    expect(
      screen.getByText("Trackable links need a web address (http or https)"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create 1 code" }));
    expect(createCodes).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          name: "Menu",
          folderId: "f1",
          qrType: "url",
          dynamic: { destination: "https://example.com/menu" },
        }),
      ],
      expect.any(Function),
    );
    expect(await screen.findByText(/Created 1 code in Flyers/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open Flyers" })).toHaveAttribute(
      "href",
      "/codes?folder=f1",
    );
  });

  it("creates a static list when tracking is off", async () => {
    const user = userEvent.setup();
    savesAll();
    renderPage();
    paste(LINKS);
    await user.click(screen.getByRole("switch", { name: /Trackable/ }));
    expect(screen.getByText("2 ready.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Create 2 codes" }));
    const inputs = vi.mocked(createCodes).mock.calls[0]![0];
    expect(inputs.map((input) => input.dynamic)).toEqual([undefined, undefined]);
    expect(inputs.map((input) => input.folderId)).toEqual([null, null]);
  });

  it("when saving stops partway, it creates only the rest", async () => {
    const user = userEvent.setup();
    const csv = [
      "name,url",
      ...Array.from({ length: 150 }, (_, i) => `Row ${i + 1},https://example.com/${i + 1}`),
    ].join("\n");
    vi.mocked(createCodes).mockImplementationOnce(async (inputs, onProgress) => {
      onProgress?.(100, rowsFor(inputs.slice(0, 100)));
      return {
        ok: false,
        error: "Saved 100 codes, then something went wrong. Please try the rest again.",
      };
    });
    renderPage();
    paste(csv);
    await user.click(screen.getByRole("button", { name: "Create 150 codes" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Created 100 of 150 codes. The other 50 weren’t created.",
    );
    savesAll();
    await user.click(screen.getByRole("button", { name: "Create the remaining 50" }));
    const retry = vi.mocked(createCodes).mock.calls[1]![0];
    expect(retry).toHaveLength(50);
    expect(retry[0]).toMatchObject({ name: "Row 101" });
    expect(await screen.findByText(/Created 150 codes/)).toBeInTheDocument();
  });

  it("makes a new folder once, even when creating has to be retried", async () => {
    const user = userEvent.setup();
    vi.mocked(createFolder).mockResolvedValue({
      ok: true,
      value: { id: "f9", name: "Spring" } as FolderRow,
    });
    vi.mocked(createCodes).mockResolvedValueOnce({
      ok: false,
      error: "The codes couldn't be saved. Please try again.",
    });
    renderPage();
    paste("name,url\nMenu,https://example.com/menu");
    await user.selectOptions(screen.getByLabelText("Folder"), "__new__");
    await user.type(screen.getByLabelText("New folder name"), "Spring");
    await user.click(screen.getByRole("button", { name: "Create 1 code" }));
    savesAll();
    await user.click(await screen.findByRole("button", { name: "Create the remaining 1" }));
    expect(createFolder).toHaveBeenCalledTimes(1);
    expect(createFolder).toHaveBeenCalledWith("u1", "Spring");
    expect(vi.mocked(createCodes).mock.calls[1]![0][0]).toMatchObject({ folderId: "f9" });
    expect(await screen.findByText(/Created 1 code in Spring/)).toBeInTheDocument();
  });

  it("creates only once when Create is pressed twice", async () => {
    const user = userEvent.setup();
    let finish!: (value: Result<QrCodeRow[]>) => void;
    vi.mocked(createCodes).mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderPage();
    paste("name,url\nMenu,https://example.com/menu");
    await user.click(screen.getByRole("button", { name: "Create 1 code" }));
    await user.click(screen.getByRole("button", { name: /Creating/ }));
    expect(createCodes).toHaveBeenCalledTimes(1);
    await act(async () =>
      finish({
        ok: true,
        value: rowsFor([
          { name: "Menu", qrType: "url", content: {}, design: {} as NewCode["design"] },
        ]),
      }),
    );
    // The panel says "Created 1 code." (the toast says the same without the full stop).
    expect(await screen.findByText("Created 1 code.")).toBeInTheDocument();
  });

  it("locks the list and settings while saving", async () => {
    const user = userEvent.setup();
    let finish!: (value: Result<QrCodeRow[]>) => void;
    vi.mocked(createCodes).mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderPage();
    paste("name,url\nMenu,https://example.com/menu");
    await user.click(screen.getByRole("button", { name: "Create 1 code" }));
    expect(screen.getByLabelText("CSV")).toBeDisabled();
    expect(screen.getByLabelText("Type of code")).toBeDisabled();
    expect(screen.getByRole("switch", { name: /Trackable/ })).toBeDisabled();
    expect(screen.getByLabelText("Folder")).toBeDisabled();
    await act(async () =>
      finish({
        ok: true,
        value: rowsFor([
          { name: "Menu", qrType: "url", content: {}, design: {} as NewCode["design"] },
        ]),
      }),
    );
    expect(screen.getByLabelText("CSV")).toBeEnabled();
  });

  it("shows progress while the ZIP is made", async () => {
    const user = userEvent.setup();
    savesAll();
    let finishZip!: () => void;
    vi.mocked(downloadZip).mockReturnValue(new Promise<void>((resolve) => (finishZip = resolve)));
    renderPage();
    paste("name,url\nMenu,https://example.com/menu");
    await user.click(screen.getByRole("button", { name: "Create 1 code" }));
    await user.click(await screen.findByRole("button", { name: "Download ZIP" }));
    expect(screen.getByRole("button", { name: /Preparing 0 of 1/ })).toBeDisabled();
    await act(async () => finishZip());
    expect(screen.getByRole("button", { name: "Download ZIP" })).toBeEnabled();
  });

  it("after creating, explains how to add the rows that needed fixing without duplicates", async () => {
    const user = userEvent.setup();
    savesAll();
    renderPage();
    paste(LINKS);
    await user.click(screen.getByRole("button", { name: "Create 1 code" }));
    expect(
      await screen.findByText(
        "Rows that need fixing were left out. To add them, upload a file with just those rows.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/upload it again/)).toBeNull();
  });

  it("downloads the created codes as a ZIP", async () => {
    const user = userEvent.setup();
    savesAll();
    renderPage();
    paste("name,url\nMenu,https://example.com/menu");
    await user.click(screen.getByRole("button", { name: "Create 1 code" }));
    await user.click(await screen.findByRole("button", { name: "Download ZIP" }));
    expect(downloadZip).toHaveBeenCalledWith(
      [expect.objectContaining({ label: "Menu" })],
      "png",
      "quickqreate-url-codes.zip",
      expect.any(Function),
    );
  });
});
