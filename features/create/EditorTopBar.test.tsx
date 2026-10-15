import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { EditorTopBar, type EditorTopBarProps } from "./EditorTopBar";

const props = (overrides: Partial<EditorTopBarProps> = {}): EditorTopBarProps => ({
  mode: "create",
  type: "links",
  back: { href: "/codes/new", label: "Change type" },
  name: "",
  namePlaceholder: "Sample links",
  onName: vi.fn(),
  dirty: false,
  submitting: false,
  onSubmit: vi.fn(),
  problem: null,
  onShowMe: vi.fn(),
  error: null,
  ...overrides,
});

describe("EditorTopBar", () => {
  it("names what's being made, suggests a name, and goes back to the gallery", async () => {
    const user = userEvent.setup();
    const onName = vi.fn();
    render(<EditorTopBar {...props({ onName })} />);
    expect(screen.getByRole("heading", { level: 1, name: "New Link list" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Change type" })).toHaveAttribute("href", "/codes/new");
    expect(screen.getByLabelText("Code name")).toHaveAttribute("placeholder", "Sample links");
    await user.type(screen.getByLabelText("Code name"), "A");
    expect(onName).toHaveBeenCalledWith("A");
    expect(screen.getByRole("button", { name: "Create code" })).toBeEnabled();
  });

  it("says what's missing, with Show me, and keeps Create off", async () => {
    const user = userEvent.setup();
    const onShowMe = vi.fn();
    render(
      <EditorTopBar
        {...props({
          onShowMe,
          problem: { message: "Add a title", tab: "content", field: "title" },
        })}
      />,
    );
    expect(screen.getByRole("button", { name: "Create code" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Create code" })).toHaveAccessibleDescription(
      /Add a title/,
    );
    await user.click(screen.getByRole("button", { name: "Show me" }));
    expect(onShowMe).toHaveBeenCalled();
  });

  it("when editing, offers Discard once something changed, and shows a failed save", async () => {
    const user = userEvent.setup();
    const onDiscard = vi.fn();
    const { rerender } = render(
      <EditorTopBar
        {...props({ mode: "edit", back: { href: "/codes/c1", label: "Back to Menu" } })}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Edit Link list" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(screen.queryByText("Unsaved changes")).toBeNull();
    rerender(
      <EditorTopBar
        {...props({ mode: "edit", dirty: true, onDiscard, error: "That ending is taken." })}
      />,
    );
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Discard changes" }));
    expect(onDiscard).toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("That ending is taken.");
  });
});
