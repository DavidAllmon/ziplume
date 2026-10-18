import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";

import { saveTemplate, setDefaultTemplate, updateTemplate } from "./api";
import { TemplateEditor } from "./TemplateEditor";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("./api", () => ({
  saveTemplate: vi.fn(async (name: string) => ({
    ok: true,
    value: { id: "t1", name },
    droppedLogo: false,
  })),
  setDefaultTemplate: vi.fn(async () => ({ ok: true, value: null })),
  updateTemplate: vi.fn(),
}));
vi.mock("@/features/generator/preview/QrView", () => ({ QrView: () => null }));
vi.mock("@/features/auth/useSession", () => ({
  useSession: () => ({ user: null, loading: true }),
}));

const show = () =>
  render(
    <ToastProvider>
      <TemplateEditor />
    </ToastProvider>,
  );

describe("TemplateEditor, new", () => {
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

describe("TemplateEditor, editing", () => {
  const brand = {
    id: "t1",
    user_id: "u1",
    name: "Brand",
    design: { fgColor: "#BE123C" },
    is_default: true,
    created_at: "",
    updated_at: "",
  };

  it("starts from the template, and saves changes in place", async () => {
    const user = userEvent.setup();
    vi.mocked(setDefaultTemplate).mockClear();
    vi.mocked(updateTemplate).mockResolvedValue({
      ok: true,
      value: { ...brand, name: "Brand 2" } as never,
    });
    render(
      <ToastProvider>
        <TemplateEditor template={brand as never} />
      </ToastProvider>,
    );
    expect(screen.getByRole("heading", { name: "Edit template" })).toBeInTheDocument();
    const name = screen.getByRole("textbox", { name: /^Name/ });
    expect(name).toHaveValue("Brand");
    expect(screen.getByRole("switch", { name: "Use for new codes" })).toBeChecked();
    await user.clear(name);
    await user.type(name, "Brand 2");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(updateTemplate).toHaveBeenCalledWith(
      "t1",
      "Brand 2",
      expect.objectContaining({ fgColor: "#BE123C" }),
    );
    // Still the default, so the default isn't touched.
    expect(setDefaultTemplate).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/templates");
  });

  it("stops it being the default when that's switched off", async () => {
    const user = userEvent.setup();
    vi.mocked(updateTemplate).mockResolvedValue({ ok: true, value: brand as never });
    vi.mocked(setDefaultTemplate).mockClear();
    render(
      <ToastProvider>
        <TemplateEditor template={brand as never} />
      </ToastProvider>,
    );
    await user.click(screen.getByRole("switch", { name: "Use for new codes" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(setDefaultTemplate).toHaveBeenCalledWith(null);
  });
});
