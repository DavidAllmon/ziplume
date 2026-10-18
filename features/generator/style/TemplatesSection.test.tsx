import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";
import type * as Env from "@/lib/env";

import { DEFAULT_DESIGN } from "../state/defaults";
import { TemplatesSection } from "./TemplatesSection";

vi.mock("@/lib/env", async (original) => ({
  ...(await original<typeof Env>()),
  accountsEnabled: true,
}));
vi.mock("@/features/auth/useSession", () => ({
  useSession: () => ({ user: { id: "u1" }, loading: false }),
}));
vi.mock("@/features/templates/api", () => ({
  listTemplates: async () => ({
    ok: true,
    value: [{ id: "t1", name: "Brand", design: {}, is_default: true }],
  }),
  saveTemplate: vi.fn(),
  deleteTemplate: vi.fn(),
}));
vi.mock("../preview/QrView", () => ({ QrView: () => null }));

const show = (props: { manageLink?: boolean; canSave?: boolean } = {}) =>
  render(
    <ToastProvider>
      <TemplatesSection design={DEFAULT_DESIGN} dispatch={() => {}} {...props} />
    </ToastProvider>,
  );

describe("TemplatesSection", () => {
  it("marks your default template", async () => {
    show();
    expect(await screen.findByText("Default")).toBeInTheDocument();
  });

  it("links to Manage templates only where asked, as a phone-sized target", async () => {
    const { unmount } = show({ manageLink: true });
    const link = await screen.findByRole("link", { name: "Manage templates" });
    expect(link).toHaveAttribute("href", "/templates");
    expect(link).toHaveClass("min-h-11");
    unmount();
    // Elsewhere (the home page's generator, New template) following it would lose the design.
    show();
    await screen.findByText("Brand");
    expect(screen.queryByRole("link", { name: "Manage templates" })).toBeNull();
  });

  it("leaves out its Save design box where the page has its own Save", async () => {
    show({ canSave: false });
    await screen.findByText("Brand");
    expect(screen.queryByRole("button", { name: "Save design" })).toBeNull();
  });
});
