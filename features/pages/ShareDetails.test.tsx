import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ShareDetails } from "./ShareDetails";

describe("ShareDetails", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("opens a short form, asks for a name and a way to reach you, then sends", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn(
      async (_url: string, _init?: RequestInit) => new Response("{}", { status: 200 }),
    );
    vi.stubGlobal("fetch", fetch);
    render(<ShareDetails slug="CARD1" owner="Ana" />);
    const open = screen.getByRole("button", { name: "Share your details" });
    expect(open).toHaveAttribute("aria-expanded", "false");
    await user.click(open);
    expect(open).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByRole("button", { name: /^Send$/ }));
    expect(screen.getByText("Add your name")).toBeInTheDocument();
    expect(screen.getByText("Add a phone number or an email")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: /^Name/ })).toHaveFocus();
    expect(fetch).not.toHaveBeenCalled();

    await user.type(screen.getByRole("textbox", { name: /^Name/ }), "Ben Visitor");
    await user.type(screen.getByRole("textbox", { name: /^Email/ }), "ben@example.com");
    // The errors follow what's typed once you've tried to send.
    expect(screen.queryByText("Add your name")).toBeNull();
    await user.click(screen.getByRole("button", { name: /^Send$/ }));
    expect(fetch.mock.calls[0]![0]).toBe("/p/CARD1/share");
    expect(JSON.parse(fetch.mock.calls[0]![1]!.body as string)).toEqual({
      name: "Ben Visitor",
      phone: "",
      email: "ben@example.com",
      note: "",
      website: "",
    });
    expect(await screen.findByText("Thanks! Ana has your details.")).toBeInTheDocument();
  });

  it("shows how long the note is, and won't send one that's too long", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<ShareDetails slug="CARD1" owner="Ana" />);
    await user.click(screen.getByRole("button", { name: "Share your details" }));
    await user.type(screen.getByRole("textbox", { name: /^Name/ }), "Ben");
    await user.type(screen.getByRole("textbox", { name: /^Email/ }), "ben@example.com");
    const note = screen.getByRole("textbox", { name: /^Note/ });
    await user.click(note);
    await user.paste("x".repeat(502));
    expect(screen.getByText("502 / 500")).toBeInTheDocument();
    expect(screen.getByText("Shorten by 2 characters")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Send$/ }));
    expect(note).toHaveFocus();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("says plainly when nothing was sent: too many from this network, or the form was turned off", async () => {
    const user = userEvent.setup();
    const send = async (status: number) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response("{}", { status })),
      );
      const view = render(<ShareDetails slug="CARD1" owner="Ana" />);
      await user.click(screen.getByRole("button", { name: "Share your details" }));
      await user.type(screen.getByRole("textbox", { name: /^Name/ }), "Ben");
      await user.type(screen.getByRole("textbox", { name: /^Email/ }), "ben@example.com");
      await user.click(screen.getByRole("button", { name: /^Send$/ }));
      const alert = await screen.findByRole("alert");
      const text = alert.textContent;
      view.unmount();
      return text;
    };
    expect(await send(429)).toMatch(/weren’t sent.*mobile data/);
    expect(await send(409)).toMatch(/turned off/);
  });

  it("stays shut in the editor's preview", async () => {
    const user = userEvent.setup();
    render(<ShareDetails slug="CARD1" owner="Ana" preview />);
    expect(screen.queryByRole("button", { name: "Share your details" })).toBeNull();
    await user.click(screen.getByText("Share your details"));
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
