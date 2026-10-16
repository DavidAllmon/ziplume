import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ToastProvider, useToast } from "./Toast";

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
});
