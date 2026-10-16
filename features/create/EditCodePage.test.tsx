import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import type * as CodesApi from "@/features/codes/api";
import { updateCodeWithSettings, type Result } from "@/features/codes/api";
import type { QrCodeRow } from "@/types/supabase";

import { EditCodePage } from "./EditCodePage";
import { savedRow } from "./fixtures";

const push = vi.fn();
const replace = vi.fn();
const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace, refresh }) }));
vi.mock("@/features/codes/api", async (original) => ({
  ...(await original<typeof CodesApi>()),
  updateCodeWithSettings: vi.fn(),
}));
vi.mock("@/features/generator/preview/useScanVerification", () => ({
  useScanVerification: () => null,
}));
vi.mock("@/features/generator/preview/QrTile", () => ({ QrTile: () => <div /> }));
vi.mock("@/features/generator/preview/QrView", () => ({ QrView: () => null }));

const CODE_HREF = "/codes/c1";

function renderPage(row: QrCodeRow = savedRow()) {
  return render(
    <ToastProvider>
      <EditCodePage
        code={row}
        folders={[]}
        mediaOwner={null}
        codeHref={CODE_HREF}
        canBePrivate={false}
      />
    </ToastProvider>,
  );
}

const bar = () => within(screen.getByRole("region", { name: "Code" }));
const saveButton = () => bar().getByRole("button", { name: "Save changes" });

beforeEach(() => {
  push.mockReset();
  // Tabs keep the open tab in the address; start every test on a clean one.
  window.history.replaceState(null, "", "/");
  replace.mockReset();
  refresh.mockReset();
  vi.mocked(updateCodeWithSettings).mockReset();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("EditCodePage", () => {
  it("opens the saved code filled in, with Save off until something changes", async () => {
    renderPage();
    expect(screen.getByLabelText("Website address")).toHaveValue("https://example.com/menu");
    expect(screen.getByLabelText("Code name")).toHaveValue("Spring menu");
    expect(screen.getByLabelText("Short link ending")).toHaveValue("SPRING");
    expect(saveButton()).toBeDisabled();
    expect(screen.queryByRole("radiogroup", { name: "Code type" })).toBeNull();
    expect(screen.queryByRole("switch", { name: "Trackable" })).toBeNull();
  });

  it("saves only what changed, then goes to the code page without asking", async () => {
    const user = userEvent.setup();
    vi.mocked(updateCodeWithSettings).mockResolvedValue({ ok: true, value: savedRow() });
    renderPage();
    await user.clear(screen.getByLabelText("Code name"));
    await user.type(screen.getByLabelText("Code name"), "Lunch menu");
    await user.click(saveButton());
    expect(updateCodeWithSettings).toHaveBeenCalledWith(
      "c1",
      { name: "Lunch menu" },
      { action: "keep" },
    );
    // The editor's history entry becomes the code page, and the refresh clears Next's
    // back/forward cache, so Back can never reopen the editor as it was before saving.
    await waitFor(() => expect(replace).toHaveBeenCalledWith(CODE_HREF));
    expect(refresh).toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(await screen.findByText("Changes saved")).toBeInTheDocument();
    expect(window.confirm).not.toHaveBeenCalled();
  });

  it("a second press while saving sends nothing", async () => {
    const user = userEvent.setup();
    let finish!: (value: Result<QrCodeRow>) => void;
    vi.mocked(updateCodeWithSettings).mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderPage();
    await user.type(screen.getByLabelText("Code name"), " 2");
    const button = saveButton();
    await user.click(button);
    await user.click(button);
    expect(updateCodeWithSettings).toHaveBeenCalledTimes(1);
    finish({ ok: true, value: savedRow() });
    await waitFor(() => expect(replace).toHaveBeenCalledTimes(1));
  });

  it("shows why a save failed and stays", async () => {
    const user = userEvent.setup();
    vi.mocked(updateCodeWithSettings).mockResolvedValue({
      ok: false,
      error: "That link ending is already taken. Try another.",
    });
    renderPage();
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    await user.clear(screen.getByLabelText("Short link ending"));
    await user.type(screen.getByLabelText("Short link ending"), "TAKEN");
    await user.click(saveButton());
    expect(await bar().findByRole("alert")).toHaveTextContent("That link ending is already taken");
    expect(replace).not.toHaveBeenCalled();
  });

  it("Discard puts everything back the way it was saved", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText("Code name"), " 2");
    await user.click(bar().getByRole("button", { name: "Discard changes" }));
    expect(screen.getByLabelText("Code name")).toHaveValue("Spring menu");
    expect(saveButton()).toBeDisabled();
  });

  it("removes the password when asked", async () => {
    const user = userEvent.setup();
    vi.mocked(updateCodeWithSettings).mockResolvedValue({ ok: true, value: savedRow() });
    renderPage(savedRow({ has_password: true }));
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    await user.click(screen.getByRole("button", { name: "Remove password" }));
    await user.click(saveButton());
    expect(updateCodeWithSettings).toHaveBeenCalledWith("c1", {}, { action: "clear" });
  });

  it("mentions a logo too large to store when the design is saved", async () => {
    const user = userEvent.setup();
    vi.mocked(updateCodeWithSettings).mockResolvedValue({ ok: true, value: savedRow() });
    renderPage(
      savedRow({ design: { logo: `data:image/png;base64,${"A".repeat(250_000)}` } as never }),
    );
    // Only a changed design is sent, so change a color.
    await user.click(screen.getByRole("tab", { name: "QR code" }));
    await user.click(screen.getByRole("button", { name: /^Colors/ }));
    await user.clear(screen.getByLabelText("Background"));
    // The field keeps its "#" when cleared.
    await user.type(screen.getByLabelText("Background"), "FFF7E6");
    await user.click(saveButton());
    expect(
      await screen.findByText("Changes saved. The logo was too large to store and was left out."),
    ).toBeInTheDocument();
  });

  it("switching tabs with unsaved changes doesn't ask to leave", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText("Code name"), " 2");
    await user.click(screen.getByRole("tab", { name: "QR code" }));
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    expect(window.confirm).not.toHaveBeenCalled();
    expect(window.location.hash).toBe("#settings");
    expect(screen.getByLabelText("Code name")).toHaveValue("Spring menu 2");
  });
});
