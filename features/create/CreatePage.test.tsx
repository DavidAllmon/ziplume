import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import type * as CodesApi from "@/features/codes/api";
import { createCodeWithSettings, type Result } from "@/features/codes/api";
import type { FolderRow, QrCodeRow } from "@/types/supabase";

import { CreatePage, type CreatePageProps } from "./CreatePage";
import { saveDraft } from "./draft";
import { createReducer, initialCreateState } from "./state";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/features/codes/api", async (original) => ({
  ...(await original<typeof CodesApi>()),
  createCodeWithSettings: vi.fn(),
}));
// Real scan checks and QR drawing need a canvas, which jsdom does not have.
vi.mock("@/features/generator/preview/useScanVerification", () => ({
  useScanVerification: () => null,
}));
vi.mock("@/features/generator/preview/QrTile", () => ({ QrTile: () => <div /> }));
vi.mock("@/features/generator/preview/QrView", () => ({ QrView: () => null }));

const USER = "user-1";
const FOLDERS = [
  { id: "f1", name: "Flyers" },
  { id: "f2", name: "Menus" },
] as FolderRow[];
const created = { id: "c1" } as QrCodeRow;

/** A promise the test resolves when it wants the "network" to answer. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

function renderPage(props: Partial<CreatePageProps> = {}) {
  return render(
    <ToastProvider>
      <CreatePage
        userId={USER}
        teamId={null}
        workspaceLabel={null}
        folders={FOLDERS}
        initialType="url"
        initialFolderId={null}
        {...props}
      />
    </ToastProvider>,
  );
}

/** The desktop preview column (the phone bar repeats some of it). */
const preview = () => within(screen.getByRole("complementary", { name: "Preview" }));

beforeEach(() => {
  window.localStorage.clear();
  push.mockReset();
  vi.mocked(createCodeWithSettings).mockReset();
});

describe("CreatePage", () => {
  it("starts clean, with the type and folder from the address", () => {
    renderPage({ initialType: "wifi", initialFolderId: "f1" });
    expect(screen.getByRole("radio", { name: /Join a Wi-Fi network/ })).toBeChecked();
    expect(screen.getByLabelText("Folder")).toHaveValue("f1");
    expect(screen.getByLabelText("Code name")).toHaveValue("");
    expect(screen.getByLabelText(/Code password/)).toBeDisabled();
  });

  it("says what's missing, then creates a trackable link with its settings and opens it", async () => {
    const user = userEvent.setup();
    vi.mocked(createCodeWithSettings).mockResolvedValue({ ok: true, value: created });
    renderPage();
    const create = preview().getByRole("button", { name: "Create code" });
    expect(create).toBeDisabled();
    expect(preview().getByText("Add a link to start")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Website address"), "https://example.com/menu");
    await user.type(screen.getByLabelText(/Code password/), "open sesame");
    await user.click(create);

    expect(createCodeWithSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        qrType: "url",
        folderId: null,
        name: "example.com/menu",
        dynamic: { destination: "https://example.com/menu" },
      }),
      { password: "open sesame", activeFrom: null, activeUntil: null },
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/codes/c1#download"));
    expect(await screen.findByText("Code created")).toBeInTheDocument();
  });

  it("creates in the team it was opened for", async () => {
    const user = userEvent.setup();
    vi.mocked(createCodeWithSettings).mockResolvedValue({ ok: true, value: created });
    renderPage({ teamId: "t1", workspaceLabel: "Cafe team" });
    expect(screen.getByText("Saving to Cafe team’s codes")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Website address"), "https://example.com");
    await user.click(preview().getByRole("button", { name: "Create code" }));
    expect(createCodeWithSettings).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: "t1" }),
      expect.anything(),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/codes/c1?workspace=t1#download"));
  });

  it("creates only once when Create is pressed twice", async () => {
    const user = userEvent.setup();
    const answer = deferred<Result<QrCodeRow>>();
    vi.mocked(createCodeWithSettings).mockReturnValue(answer.promise);
    renderPage();
    await user.type(screen.getByLabelText("Website address"), "https://example.com");
    await user.click(preview().getByRole("button", { name: "Create code" }));
    const pending = preview().getByRole("button", { name: /Creating/ });
    expect(pending).toBeDisabled();
    await user.click(pending);
    expect(createCodeWithSettings).toHaveBeenCalledTimes(1);
    await act(async () => answer.resolve({ ok: true, value: created }));
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("stays on the page and explains when creating fails", async () => {
    const user = userEvent.setup();
    vi.mocked(createCodeWithSettings).mockResolvedValue({
      ok: false,
      error: "That link ending is already taken. Try another.",
    });
    renderPage();
    await user.type(screen.getByLabelText("Website address"), "https://example.com");
    await user.click(preview().getByRole("button", { name: "Create code" }));
    expect(await preview().findByRole("alert")).toHaveTextContent(
      "That link ending is already taken. Try another.",
    );
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Website address")).toHaveValue("https://example.com");
    expect(preview().getByRole("button", { name: "Create code" })).toBeEnabled();
    // The reason stays next to Create (a toast fades and is cut short on phones) until the next edit.
    await user.type(screen.getByLabelText("Website address"), "/x");
    expect(preview().queryByRole("alert")).toBeNull();
  });

  it("says when the logo was too large to keep", async () => {
    const user = userEvent.setup();
    vi.mocked(createCodeWithSettings).mockResolvedValue({ ok: true, value: created });
    const withLogo = createReducer(
      createReducer(initialCreateState({ type: "url", folderId: null }), {
        type: "code",
        action: { type: "setField", qrType: "url", field: "url", value: "https://example.com" },
      }),
      {
        type: "code",
        action: { type: "setLogo", logo: `data:image/png;base64,${"A".repeat(250_000)}` },
      },
    );
    saveDraft(USER, withLogo);
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Resume" }));
    await user.click(preview().getByRole("button", { name: "Create code" }));
    expect(
      await screen.findByText("Code created. The logo was too large to store and was left out."),
    ).toBeInTheDocument();
  });

  it("offers an unfinished code and restores it only on Resume", async () => {
    const user = userEvent.setup();
    const old = createReducer(
      createReducer(initialCreateState({ type: "url", folderId: "gone" }), {
        type: "code",
        action: { type: "setField", qrType: "url", field: "url", value: "https://example.com/old" },
      }),
      { type: "code", action: { type: "setName", name: "Old poster" } },
    );
    saveDraft(USER, old, new Date(Date.now() - 2 * 60 * 60 * 1000));
    renderPage({ initialFolderId: "f1" });

    expect(
      await screen.findByText(/You have an unfinished code from 2 hours ago/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Website address")).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "Resume" }));
    expect(screen.getByLabelText("Website address")).toHaveValue("https://example.com/old");
    expect(screen.getByLabelText("Code name")).toHaveValue("Old poster");
    // The draft's folder is gone, so it stays in the folder the page was opened for.
    expect(screen.getByLabelText("Folder")).toHaveValue("f1");
    expect(screen.queryByText(/unfinished code/)).toBeNull();
  });

  it("Discard clears the draft and keeps the page fresh", async () => {
    const user = userEvent.setup();
    saveDraft(
      USER,
      createReducer(initialCreateState({ type: "text", folderId: null }), {
        type: "code",
        action: { type: "setName", name: "Old note" },
      }),
    );
    renderPage();
    await user.click(await screen.findByRole("button", { name: "Discard" }));
    expect(screen.queryByText(/unfinished code/)).toBeNull();
    expect(window.localStorage.getItem("quickqreate:draft:v2:user-1")).toBeNull();
    expect(screen.getByLabelText("Code name")).toHaveValue("");
  });

  it("offers Download without saving for static codes only", () => {
    const { unmount } = renderPage({ initialType: "text" });
    expect(preview().getByRole("button", { name: "Download without saving" })).toBeInTheDocument();
    unmount();
    renderPage({ initialType: "url" });
    expect(preview().queryByRole("button", { name: "Download without saving" })).toBeNull();
  });
});
