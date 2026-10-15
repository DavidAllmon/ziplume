import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ToastProvider } from "./Toast";

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
});
