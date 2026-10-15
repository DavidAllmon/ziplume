import { render, renderHook, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ContentEditor } from "@/features/generator/content/types";
import type { CodeTypeId } from "@/lib/qr/types";

import { EditorLayout } from "./EditorLayout";
import { savedRow } from "./fixtures";
import { fromSavedCode } from "./load";
import { useCodeDraft } from "./useCodeDraft";

// The content editor this layout builds, as the Content tab received it.
const seen: { editor: ContentEditor | null } = { editor: null };
vi.mock("./sections/ContentSection", () => ({
  ContentSection: ({ editor }: { editor: ContentEditor }) => {
    seen.editor = editor;
    return <p>Content form</p>;
  },
}));
vi.mock("@/features/generator/preview/useScanVerification", () => ({
  useScanVerification: () => null,
}));
vi.mock("@/features/generator/preview/QrTile", () => ({ QrTile: () => <div>QR tile</div> }));
vi.mock("@/features/generator/preview/QrView", () => ({ QrView: () => null }));
vi.mock("@/features/generator/preview/PagePreview", () => ({
  PagePreview: () => <div>Page preview</div>,
}));

afterEach(() => window.history.replaceState(null, "", "/"));

function renderLayout({
  mode = "create",
  dirty = false,
  type = "url",
  savedSlug,
  error = null,
}: {
  mode?: "create" | "edit";
  dirty?: boolean;
  type?: CodeTypeId;
  savedSlug?: string;
  error?: string | null;
} = {}) {
  const initial = savedSlug
    ? fromSavedCode(
        savedRow({
          qr_type: "links",
          is_dynamic: true,
          slug: savedSlug,
          content: { title: "Menu", links: [] },
        }),
      )
    : mode === "edit"
      ? fromSavedCode(savedRow())
      : undefined;
  const { result } = renderHook(() =>
    useCodeDraft({ type, folderId: null }, { initial, requireSlug: mode === "edit" }),
  );
  return render(
    <EditorLayout
      draft={result.current}
      folders={[]}
      mediaOwner="owner-1"
      back={{ href: "/codes/new", label: "Change type" }}
      saved={
        savedSlug
          ? {
              slug: savedSlug,
              hasPassword: false,
              removePassword: false,
              onRemovePassword: vi.fn(),
            }
          : undefined
      }
      controls={{
        mode,
        submitting: false,
        onSubmit: vi.fn(),
        error,
        dirty,
        onDiscard: vi.fn(),
      }}
    />,
  );
}

const bar = () => within(screen.getByRole("region", { name: "Code" }));
const preview = () => within(screen.getByRole("complementary", { name: "Preview" }));
const tabNames = () => screen.getAllByRole("tab").map((tab) => tab.textContent);

describe("EditorLayout", () => {
  it("shows a save error on up to two lines in the phone's bottom bar, not cut to one", () => {
    const error = "That short link is already taken. Pick another one in Settings.";
    renderLayout({ error });
    const phoneBar = document.querySelector<HTMLElement>('[data-actionbar="create"]')!;
    const line = within(phoneBar).getByText(error);
    expect(line).toHaveClass("line-clamp-2");
    expect(line).not.toHaveClass("truncate");
  });

  it("hands the code owner's space to the content editor", () => {
    renderLayout({ mode: "edit" });
    expect(seen.editor?.workspace).toEqual({ ownerId: "owner-1" });
    expect(seen.editor?.pageCards).toBe(true);
  });

  it("gives hosted pages a Look tab, and other codes none", () => {
    const { unmount } = renderLayout({ type: "links" });
    expect(tabNames()).toEqual(["Content", "Look", "QR code", "Settings"]);
    unmount();
    renderLayout({ type: "url" });
    expect(tabNames()).toEqual(["Content", "QR code", "Settings"]);
  });

  it("opens Content, and keeps the chosen tab in the address", async () => {
    const user = userEvent.setup();
    renderLayout({ type: "links" });
    expect(screen.getByRole("tab", { name: "Content" })).toHaveAttribute("aria-selected", "true");
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    expect(window.location.hash).toBe("#settings");
    expect(screen.getByRole("tabpanel")).toHaveTextContent(/Folder/);
  });

  it("opens the tab in the address", () => {
    window.history.replaceState(null, "", "/codes/new?type=links#look");
    renderLayout({ type: "links" });
    expect(screen.getByRole("tab", { name: "Look" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("heading", { name: "Page look" })).toBeVisible();
  });

  it("shows the page for Content and Look, and the code for the QR code tab", async () => {
    const user = userEvent.setup();
    renderLayout({ type: "links" });
    expect(preview().getByText("Page preview")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "QR code" }));
    expect(preview().getByText("QR tile")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Look" }));
    expect(preview().getByText("Page preview")).toBeInTheDocument();
  });

  it("says Create in create mode, and what's missing, with Show me opening the tab", async () => {
    const user = userEvent.setup();
    renderLayout({ type: "url" });
    expect(bar().getByRole("button", { name: "Create code" })).toBeDisabled();
    expect(bar().getByText(/Add a link to start/)).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Settings" }));
    await user.click(bar().getByRole("button", { name: "Show me" }));
    expect(screen.getByRole("tab", { name: "Content" })).toHaveAttribute("aria-selected", "true");
  });

  it("says Save changes in edit mode, enabled only once something changed", () => {
    const { unmount } = renderLayout({ mode: "edit", dirty: false });
    expect(bar().getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(bar().queryByRole("button", { name: "Discard changes" })).toBeNull();
    expect(preview().queryByRole("button", { name: /Download without saving/ })).toBeNull();
    unmount();
    renderLayout({ mode: "edit", dirty: true });
    expect(bar().getByRole("button", { name: "Save changes" })).toBeEnabled();
    expect(bar().getByRole("button", { name: "Discard changes" })).toBeInTheDocument();
  });

  it("shows the code straight away when the page opens on the QR code tab", () => {
    window.history.replaceState(null, "", "/codes/new?type=links#qr");
    renderLayout({ type: "links" });
    expect(preview().getByText("QR tile")).toBeInTheDocument();
  });

  it("switches the page preview between phone, tablet and desktop", async () => {
    const user = userEvent.setup();
    renderLayout({ type: "links" });
    expect(preview().getByRole("radio", { name: "Phone" })).toBeChecked();
    await user.click(preview().getByRole("radio", { name: "Desktop" }));
    expect(preview().getByRole("radio", { name: "Desktop" })).toBeChecked();
    await user.click(screen.getByRole("tab", { name: "QR code" }));
    // The device switch is for the page only.
    expect(preview().queryByRole("radio", { name: "Desktop" })).toBeNull();
  });

  it("links to the live page when editing a saved hosted page", () => {
    renderLayout({ mode: "edit", type: "links", savedSlug: "MENU12" });
    expect(preview().getByRole("link", { name: /Open the live page/ })).toHaveAttribute(
      "href",
      "/p/MENU12",
    );
  });
});
