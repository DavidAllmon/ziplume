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
  // Each test starts on a plain history entry, not a copy left by the last test.
  window.history.replaceState(null, "", "/codes/c1/edit");
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

  it("keeps one copy of the page on the history stack, however often changes come and go", () => {
    const push = vi.spyOn(window.history, "pushState");
    const { rerender } = render(<Page active />);
    rerender(<Page active={false} />);
    rerender(<Page active />);
    expect(push).toHaveBeenCalledTimes(1);
  });

  it("asks before Back leaves, and Cancel stays on the page", () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    const forward = vi.spyOn(window.history, "forward").mockImplementation(() => {});
    render(<Page active />);
    confirm.mockReturnValue(false);
    // Back from the copy lands on the page itself.
    window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    expect(confirm).toHaveBeenCalledWith(LEAVE_MESSAGE);
    expect(forward).toHaveBeenCalledTimes(1);
    expect(back).not.toHaveBeenCalled();
  });

  it("OK on Back leaves, and the browser isn't asked a second time", () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    render(<Page active />);
    confirm.mockReturnValue(true);
    window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    expect(back).toHaveBeenCalledTimes(1);
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("with nothing left unsaved, Back leaves in one press", () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    const { rerender } = render(<Page active />);
    rerender(<Page active={false} />);
    window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    expect(confirm).not.toHaveBeenCalled();
    expect(back).toHaveBeenCalledTimes(1);
  });

  it("coming back to the copy isn't leaving", () => {
    const back = vi.spyOn(window.history, "back").mockImplementation(() => {});
    render(<Page active />);
    window.dispatchEvent(new PopStateEvent("popstate", { state: window.history.state }));
    expect(confirm).not.toHaveBeenCalled();
    expect(back).not.toHaveBeenCalled();
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
