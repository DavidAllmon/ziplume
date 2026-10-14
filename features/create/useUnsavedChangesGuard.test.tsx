import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LEAVE_MESSAGE, useUnsavedChangesGuard } from "./useUnsavedChangesGuard";

function Page({ active }: { active: boolean }) {
  useUnsavedChangesGuard(active);
  return (
    <>
      {/* Plain links stand in for any in-app link; the guard listens on the document. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/codes">Codes</a>
      <a href="/codes" target="_blank">
        New tab
      </a>
      <a href="#settings">Settings</a>
    </>
  );
}

/** Clicks a link and reports whether the guard stopped the navigation. */
function clickBlocked(name: string, init: MouseEventInit = {}) {
  let prevented = false;
  const record = (event: Event) => (prevented = event.defaultPrevented);
  document.addEventListener("click", record);
  fireEvent.click(screen.getByRole("link", { name }), init);
  document.removeEventListener("click", record);
  return prevented;
}

let confirm: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  confirm = vi.spyOn(window, "confirm");
});
afterEach(() => vi.restoreAllMocks());

describe("useUnsavedChangesGuard", () => {
  it("asks before an in-app link leaves, and stays when you cancel", () => {
    render(<Page active />);
    confirm.mockReturnValue(false);
    expect(clickBlocked("Codes")).toBe(true);
    expect(confirm).toHaveBeenCalledWith(LEAVE_MESSAGE);
    confirm.mockReturnValue(true);
    expect(clickBlocked("Codes")).toBe(false);
  });

  it("leaves new-tab links, page anchors and modified clicks alone", () => {
    render(<Page active />);
    expect(clickBlocked("New tab")).toBe(false);
    expect(clickBlocked("Settings")).toBe(false);
    expect(clickBlocked("Codes", { metaKey: true })).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
  });

  it("asks the browser to confirm closing or reloading", () => {
    render(<Page active />);
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
  });

  it("asks before Back leaves, and stays when you cancel", () => {
    const push = vi.spyOn(window.history, "pushState");
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    render(<Page active />);
    expect(push).toHaveBeenCalledTimes(1);
    confirm.mockReturnValue(false);
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(push).toHaveBeenCalledTimes(2);
    expect(back).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    window.dispatchEvent(new PopStateEvent("popstate"));
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("turns off once inactive", () => {
    const { rerender } = render(<Page active />);
    rerender(<Page active={false} />);
    expect(clickBlocked("Codes")).toBe(false);
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(confirm).not.toHaveBeenCalled();
  });
});
