import { render, renderHook, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ContentEditor } from "@/features/generator/content/types";

import { EditorLayout } from "./EditorLayout";
import { fromSavedCode } from "./load";
import { savedRow } from "./fixtures";
import { useCodeDraft } from "./useCodeDraft";

// The content editor this layout builds, as the Content section received it.
const seen: { editor: ContentEditor | null } = { editor: null };
vi.mock("./sections/ContentSection", () => ({
  ContentSection: ({ editor }: { editor: ContentEditor }) => {
    seen.editor = editor;
    return null;
  },
}));
vi.mock("@/features/generator/preview/useScanVerification", () => ({
  useScanVerification: () => null,
}));
vi.mock("@/features/generator/preview/QrTile", () => ({ QrTile: () => <div /> }));
vi.mock("@/features/generator/preview/QrView", () => ({ QrView: () => null }));

function renderLayout(mode: "create" | "edit", dirty = false) {
  const initial = fromSavedCode(savedRow());
  const { result } = renderHook(() =>
    useCodeDraft({ type: "url", folderId: null }, { initial, requireSlug: true }),
  );
  return render(
    <EditorLayout
      draft={result.current}
      folders={[]}
      mediaOwner="owner-1"
      controls={{
        mode,
        submitting: false,
        onSubmit: vi.fn(),
        error: null,
        dirty,
        onDiscard: vi.fn(),
      }}
    />,
  );
}

const preview = () => within(screen.getByRole("complementary", { name: "Preview" }));

describe("EditorLayout", () => {
  it("hands the code owner's space to the content editor", () => {
    renderLayout("edit");
    expect(seen.editor?.workspace).toEqual({ ownerId: "owner-1" });
  });

  it("says Create in create mode", () => {
    renderLayout("create");
    expect(preview().getByRole("button", { name: "Create code" })).toBeEnabled();
  });

  it("says Save changes in edit mode, enabled only once something changed", () => {
    const { unmount } = renderLayout("edit", false);
    expect(preview().getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(preview().queryByRole("button", { name: "Discard changes" })).toBeNull();
    expect(preview().queryByRole("button", { name: /Download without saving/ })).toBeNull();
    unmount();
    renderLayout("edit", true);
    expect(preview().getByRole("button", { name: "Save changes" })).toBeEnabled();
    expect(preview().getByRole("button", { name: "Discard changes" })).toBeInTheDocument();
  });
});
