import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import type * as Env from "@/lib/env";

import { BulkGenerator } from "./BulkGenerator";
import type * as Zip from "./zip";
import { downloadZip } from "./zip";

let user: { id: string } | null = null;
vi.mock("@/features/auth/useSession", () => ({ useSession: () => ({ user, loading: false }) }));
vi.mock("@/lib/env", async (original) => ({
  ...(await original<typeof Env>()),
  accountsEnabled: true,
}));
// QR drawing needs a canvas, which jsdom does not have.
vi.mock("@/features/generator/preview/QrTile", () => ({ QrTile: () => <div /> }));
vi.mock("./zip", async (original) => ({ ...(await original<typeof Zip>()), downloadZip: vi.fn() }));

const renderBulk = () =>
  render(
    <ToastProvider>
      <BulkGenerator />
    </ToastProvider>,
  );

beforeEach(() => {
  user = null;
  vi.mocked(downloadZip).mockReset();
});

describe("BulkGenerator (public)", () => {
  it("checks a pasted list and downloads it, without saving anything", async () => {
    user = { id: "u1" };
    renderBulk();
    fireEvent.change(screen.getByLabelText("CSV"), {
      target: { value: "name,url\nMenu,example.com/menu\nBad,not a link" },
    });
    expect(screen.getByText("1 ready, 1 need fixing.")).toBeInTheDocument();
    expect(screen.queryByRole("switch")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Download 1 code" }));
    await waitFor(() =>
      expect(downloadZip).toHaveBeenCalledWith(
        [expect.objectContaining({ label: "Menu", content: "https://example.com/menu" })],
        "png",
        "quickqreate-url-codes.zip",
        expect.any(Function),
      ),
    );
  });

  it("points signed-in people to bulk create in their codes", () => {
    user = { id: "u1" };
    renderBulk();
    expect(screen.getByRole("link", { name: "Create them in your codes" })).toHaveAttribute(
      "href",
      "/codes/bulk",
    );
  });

  it("asks everyone else to sign in to save", () => {
    renderBulk();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login?next=/codes/bulk",
    );
  });
});
