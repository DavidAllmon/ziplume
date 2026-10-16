import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ToastProvider, useDismissToast, useToast } from "./Toast";

describe("ToastProvider", () => {
  // The iPhone home-indicator area can't be emulated in the browser tests, so pin it here: with
  // no bar at the bottom (public pages, the home-screen app), toasts must still clear it.
  it("keeps toasts clear of the iPhone home indicator when no bar is showing", () => {
    const { container } = render(<ToastProvider>page</ToastProvider>);
    const stack = container.querySelector("[data-toasts]");
    expect(stack?.className).toContain(
      "bottom-[calc(max(var(--tabbar-h)+var(--actionbar-h),env(safe-area-inset-bottom))+0.75rem)]",
    );
  });

  it("offers an action, such as Undo, and closes once it's used", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    function Show() {
      const toast = useToast();
      return (
        <button
          type="button"
          onClick={() => toast("Theme set to Ocean", "success", { label: "Undo", onAction })}
        >
          Show
        </button>
      );
    }
    render(
      <ToastProvider>
        <Show />
      </ToastProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Show" }));
    await user.click(screen.getByRole("button", { name: "Undo" }));
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Theme set to Ocean")).toBeNull();
  });

  function Buttons() {
    const toast = useToast();
    const dismiss = useDismissToast();
    const undo = { label: "Undo", onAction: () => {} };
    return (
      <>
        <button type="button" onClick={() => toast("Theme set to Ocean", "success", undo, "theme")}>
          Ocean
        </button>
        <button
          type="button"
          onClick={() => toast("Theme set to Forest", "success", undo, "theme")}
        >
          Forest
        </button>
        <button type="button" onClick={() => dismiss("theme")}>
          Dismiss
        </button>
      </>
    );
  }

  it("replaces a toast that shares a key, and closes one by its key", () => {
    render(
      <ToastProvider>
        <Buttons />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Ocean" }));
    fireEvent.click(screen.getByRole("button", { name: "Forest" }));
    expect(screen.queryByText("Theme set to Ocean")).toBeNull();
    expect(screen.getByText("Theme set to Forest")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Theme set to Forest")).toBeNull();
  });

  it("stays open while it's hovered or focused, then closes", () => {
    vi.useFakeTimers();
    try {
      render(
        <ToastProvider>
          <Buttons />
        </ToastProvider>,
      );
      fireEvent.click(screen.getByRole("button", { name: "Ocean" }));
      const undo = screen.getByRole("button", { name: "Undo" });
      act(() => undo.focus());
      act(() => void vi.advanceTimersByTime(20000));
      expect(screen.getByText("Theme set to Ocean")).toBeInTheDocument();
      act(() => undo.blur());
      fireEvent.mouseEnter(undo.parentElement!);
      act(() => void vi.advanceTimersByTime(20000));
      expect(screen.getByText("Theme set to Ocean")).toBeInTheDocument();
      fireEvent.mouseLeave(undo.parentElement!);
      act(() => void vi.advanceTimersByTime(6000));
      expect(screen.queryByText("Theme set to Ocean")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
