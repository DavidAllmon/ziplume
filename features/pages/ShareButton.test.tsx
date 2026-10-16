import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ShareButton } from "./ShareButton";

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(navigator, "share", { value: undefined, configurable: true });
});

describe("ShareButton", () => {
  const touch = (coarse: boolean) =>
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({ matches: coarse && query === "(pointer: coarse)" })),
    );

  it("opens the share sheet on phones and tablets", async () => {
    touch(true);
    const share = vi.fn(async () => {});
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    document.title = "Spring menu";
    render(<ShareButton />);
    await userEvent.click(screen.getByRole("button", { name: "Share this page" }));
    expect(share).toHaveBeenCalledWith({ title: "Spring menu", url: window.location.href });
  });

  it("copies the link elsewhere, and says where to find it if copying is blocked", async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const { unmount } = render(<ShareButton />);
    await userEvent.click(screen.getByRole("button", { name: "Share this page" }));
    expect(writeText).toHaveBeenCalledWith(window.location.href);
    expect(screen.getByRole("status")).toHaveTextContent("Link copied");
    unmount();
    writeText.mockRejectedValueOnce(new Error("blocked"));
    render(<ShareButton />);
    await userEvent.click(screen.getByRole("button", { name: "Share this page" }));
    expect(screen.getByRole("status")).toHaveTextContent("Copy the link from the address bar");
  });

  it("is a still picture in the editor's preview", () => {
    render(<ShareButton preview />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("copies the link on a computer, even where it has a share sheet", async () => {
    touch(false);
    const share = vi.fn(async () => {});
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<ShareButton />);
    await userEvent.click(screen.getByRole("button", { name: "Share this page" }));
    expect(share).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledWith(window.location.href);
  });

  it("draws on the page's own background, so it reads over photos on every theme", () => {
    render(<ShareButton />);
    expect(screen.getByRole("button", { name: "Share this page" }).className).toContain(
      "bg-(--bg)",
    );
  });
});
