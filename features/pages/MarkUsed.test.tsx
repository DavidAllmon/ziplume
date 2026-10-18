import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MarkUsed } from "./MarkUsed";

const KEY = "ziplume:coupon:COUP1";

describe("MarkUsed", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it("asks first, then marks the coupon used on this phone", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(JSON.stringify({ ok: true, already: false }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetch);
    render(<MarkUsed slug="COUP1" validUntil="" />);
    await user.click(screen.getByRole("button", { name: "Mark as used" }));
    expect(screen.getByText("Mark this coupon as used?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Yes, mark it used" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Not yet" }));
    expect(fetch).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Mark as used" }));
    await user.click(screen.getByRole("button", { name: "Yes, mark it used" }));
    expect(await screen.findByText("Used on this phone")).toBeInTheDocument();
    const sent = JSON.parse(fetch.mock.calls[0]![1]!.body as string) as { phone: string };
    expect(sent.phone).toMatch(/^[0-9a-f]{32}$/);
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toMatchObject({ id: sent.phone });
  });

  it("remembers a coupon this phone used, and sends the same phone's ID after a lost answer", async () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ id: "a".repeat(32), usedAt: "2030-01-01T12:00:00Z" }),
    );
    const { unmount } = render(<MarkUsed slug="COUP1" validUntil="" />);
    expect(screen.getByText("Used on this phone")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mark as used" })).toBeNull();
    unmount();

    const user = userEvent.setup();
    const fetch = vi.fn(
      async (_url: string, _init?: RequestInit) => new Response("{}", { status: 503 }),
    );
    vi.stubGlobal("fetch", fetch);
    window.localStorage.setItem(KEY, JSON.stringify({ id: "b".repeat(32) }));
    render(<MarkUsed slug="COUP1" validUntil="" />);
    await user.click(screen.getByRole("button", { name: "Mark as used" }));
    await user.click(screen.getByRole("button", { name: "Yes, mark it used" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn’t be marked");
    expect(JSON.parse(fetch.mock.calls[0]![1]!.body as string)).toEqual({ phone: "b".repeat(32) });
  });

  it("goes away once the offer has ended, and says when the page won't take it", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2030, 0, 5, 12));
    const { unmount } = render(<MarkUsed slug="COUP1" validUntil="2030-01-04" />);
    expect(screen.queryByRole("button", { name: "Mark as used" })).toBeNull();
    unmount();
    vi.useRealTimers();

    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 409 })),
    );
    render(<MarkUsed slug="COUP1" validUntil="" />);
    await user.click(screen.getByRole("button", { name: "Mark as used" }));
    await user.click(screen.getByRole("button", { name: "Yes, mark it used" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("can’t be marked as used any more");
  });

  it("does nothing in the editor's preview", () => {
    render(<MarkUsed slug="COUP1" validUntil="" preview />);
    expect(screen.queryByRole("button", { name: "Mark as used" })).toBeNull();
    expect(screen.getByText("Mark as used")).toHaveAttribute("aria-disabled");
  });
});
