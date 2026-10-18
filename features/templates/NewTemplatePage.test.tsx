import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";

import { saveTemplate, setDefaultTemplate } from "./api";
import { NewTemplatePage } from "./NewTemplatePage";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("./api", () => ({
  saveTemplate: vi.fn(async (name: string) => ({
    ok: true,
    value: { id: "t1", name },
    droppedLogo: false,
  })),
  setDefaultTemplate: vi.fn(async () => ({ ok: true, value: null })),
}));
vi.mock("@/features/generator/preview/QrView", () => ({ QrView: () => null }));
vi.mock("@/features/auth/useSession", () => ({
  useSession: () => ({ user: null, loading: true }),
}));

const show = () =>
  render(
    <ToastProvider>
      <NewTemplatePage />
    </ToastProvider>,
  );

describe("NewTemplatePage", () => {
  it("is the Design panel alone, without a second Save box", () => {
    show();
    expect(screen.getByRole("heading", { name: "QR code design" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save design" })).toBeNull();
  });

  it("needs a name, then saves the design and can make it the default", async () => {
    const user = userEvent.setup();
    show();
    await user.click(screen.getByRole("button", { name: "Save template" }));
    expect(screen.getByText("Name the template")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^Name/ })).toHaveFocus();
    expect(saveTemplate).not.toHaveBeenCalled();

    await user.type(screen.getByRole("textbox", { name: /^Name/ }), "Brand");
    await user.click(screen.getByRole("switch", { name: "Use for new codes" }));
    await user.click(screen.getByRole("button", { name: "Save template" }));
    expect(saveTemplate).toHaveBeenCalledWith(
      "Brand",
      expect.objectContaining({ dotStyle: "rounded" }),
    );
    expect(setDefaultTemplate).toHaveBeenCalledWith("t1");
    expect(push).toHaveBeenCalledWith("/templates");
  });

  it("doesn't save when Enter is pressed while designing", async () => {
    const user = userEvent.setup();
    vi.mocked(saveTemplate).mockClear();
    show();
    await user.type(screen.getByRole("textbox", { name: /^Name/ }), "Brand");
    await user.click(screen.getByRole("button", { name: /^Colors/ }));
    const color = screen.getByRole("textbox", { name: "Code color" });
    await user.clear(color);
    await user.type(color, "#BE123C{Enter}");
    expect(saveTemplate).not.toHaveBeenCalled();
    // Nor does it offer a way off the page that would lose the design.
    expect(screen.queryByRole("link", { name: "Manage templates" })).toBeNull();
  });
});
