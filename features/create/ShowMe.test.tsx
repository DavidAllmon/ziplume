import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import type * as Env from "@/lib/env";

import { CreatePage } from "./CreatePage";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/env", async (original) => ({
  ...(await original<typeof Env>()),
  accountsEnabled: true,
}));
vi.mock("@/features/auth/useSession", () => ({
  useSession: () => ({ user: { id: "user-1" }, loading: false }),
}));
// Signed in, the QR code tab lists saved templates; there's no database here.
vi.mock("@/features/templates/api", () => ({
  listTemplates: vi.fn().mockResolvedValue({ ok: true, value: [] }),
  saveTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
}));
vi.mock("@/features/generator/preview/useScanVerification", () => ({
  useScanVerification: () => null,
}));
vi.mock("@/features/generator/preview/QrTile", () => ({ QrTile: () => <div /> }));
vi.mock("@/features/generator/preview/QrView", () => ({ QrView: () => null }));
vi.mock("@/features/generator/preview/PagePreview", () => ({ PagePreview: () => <div /> }));

afterEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, "", "/");
});

const renderPage = (initialType: "links" | "url" | "wifi") =>
  render(
    <ToastProvider>
      <CreatePage
        userId="user-1"
        folders={[]}
        initialType={initialType}
        initialFolderId={null}
        inTeam={false}
      />
    </ToastProvider>,
  );
const bar = () => within(screen.getByRole("region", { name: "Code" }));

describe("Show me", () => {
  it("opens the tab, focuses the field and shows its error", async () => {
    const user = userEvent.setup();
    renderPage("links");
    await user.click(screen.getByRole("tab", { name: "QR code" }));
    expect(bar().getByText(/Add a title/)).toBeInTheDocument();
    await user.click(bar().getByRole("button", { name: "Show me" }));
    expect(screen.getByRole("tab", { name: "Content" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Title")).toHaveFocus();
    expect(screen.getByLabelText("Title")).toHaveAccessibleDescription(/Add a title/);
  });

  it("goes to a settings problem's field", async () => {
    const user = userEvent.setup();
    renderPage("url");
    await user.type(screen.getByLabelText("Website address"), "example.com");
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    // Too short (the field trims spaces as you type, so "no spaces" would just become valid).
    await user.type(screen.getByLabelText(/Short link ending/), "ab");
    await user.click(screen.getByRole("tab", { name: "Content" }));
    await user.click(bar().getByRole("button", { name: "Show me" }));
    expect(screen.getByRole("tab", { name: "Settings" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText(/Short link ending/)).toHaveFocus();
  });

  it("focuses the first field when the problem has no field of its own", async () => {
    const user = userEvent.setup();
    renderPage("url");
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    await user.click(bar().getByRole("button", { name: "Show me" }));
    expect(screen.getByLabelText("Website address")).toHaveFocus();
  });

  it("on an instant code, goes to the field with the problem and shows it", async () => {
    const user = userEvent.setup();
    renderPage("wifi");
    await user.type(screen.getByLabelText("Network name (SSID)"), "Cafe");
    await user.type(screen.getByLabelText("Password"), "short");
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    await user.click(bar().getByRole("button", { name: "Show me" }));
    expect(screen.getByLabelText("Password")).toHaveFocus();
    expect(screen.getByLabelText("Password")).toHaveAccessibleDescription(/at least 8 characters/);
  });
});
