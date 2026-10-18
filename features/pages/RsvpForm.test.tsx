import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PAGE_DEFAULTS } from "@/lib/pages/types";

import { RsvpForm } from "./RsvpForm";

const event = (patch: object = {}) => ({
  ...PAGE_DEFAULTS.event(),
  title: "Launch",
  start: "2099-01-10T13:00",
  end: "2099-01-10T16:00",
  timeZone: "America/New_York",
  rsvp: true,
  ...patch,
});
// The places-left answer for GET, and `post` for the RSVP itself.
const server = (left: number | null, post: Response = new Response("{}", { status: 200 })) =>
  vi.fn(async (_url: string, init?: RequestInit) =>
    init?.method === "POST" ? post : new Response(JSON.stringify({ left }), { status: 200 }),
  );

describe("RsvpForm", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    window.localStorage.clear();
  });

  it("asks who's coming, checks it, and puts them on the list", async () => {
    const user = userEvent.setup();
    const fetch = server(null);
    vi.stubGlobal("fetch", fetch);
    render(<RsvpForm slug="EVT1" event={event()} />);
    // No limit, so nothing to ask the server before sending.
    expect(fetch).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Send RSVP" }));
    expect(screen.getByText("Add your name")).toBeInTheDocument();
    expect(screen.getByText("Add your email")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: /^Name/ }), "Ana");
    await user.type(screen.getByRole("textbox", { name: /^Email/ }), "ana@example.com");
    await user.selectOptions(screen.getByRole("combobox", { name: /Guests/ }), "2");
    await user.click(screen.getByRole("button", { name: "Send RSVP" }));
    expect(JSON.parse(fetch.mock.calls[0]![1]!.body as string)).toEqual({
      name: "Ana",
      email: "ana@example.com",
      guests: 2,
      note: "",
      website: "",
    });
    expect(await screen.findByText("You’re on the list")).toBeInTheDocument();
    expect(window.localStorage.getItem("ziplume:rsvp:EVT1")).toBe(JSON.stringify({ guests: 2 }));
  });

  it("offers only the places left, and says when the event is full", async () => {
    vi.stubGlobal("fetch", server(2));
    const { unmount } = render(<RsvpForm slug="EVT1" event={event({ rsvpCapacity: "40" })} />);
    const guests = screen.getByRole("combobox", { name: /Guests/ });
    await vi.waitFor(() => expect(within(guests).getAllByRole("option")).toHaveLength(2));
    unmount();
    vi.stubGlobal("fetch", server(0));
    render(<RsvpForm slug="EVT1" event={event({ rsvpCapacity: "40" })} />);
    expect(await screen.findByText("This event is full.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send RSVP" })).toBeNull();
  });

  it("says how many are left when someone else took the places first", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      server(4, new Response(JSON.stringify({ error: "full", left: 1 }), { status: 409 })),
    );
    render(<RsvpForm slug="EVT1" event={event({ rsvpCapacity: "4" })} />);
    const guests = screen.getByRole("combobox", { name: /Guests/ });
    await vi.waitFor(() => expect(within(guests).getAllByRole("option")).toHaveLength(4));
    await user.type(screen.getByRole("textbox", { name: /^Name/ }), "Ana");
    await user.type(screen.getByRole("textbox", { name: /^Email/ }), "ana@example.com");
    await user.selectOptions(guests, "3");
    await user.click(screen.getByRole("button", { name: "Send RSVP" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Only 1 place is left");
    expect(within(guests).getAllByRole("option")).toHaveLength(1);
  });

  it("remembers this phone's RSVP, and closes when the event has ended", () => {
    window.localStorage.setItem("ziplume:rsvp:EVT1", JSON.stringify({ guests: 3 }));
    const { unmount } = render(<RsvpForm slug="EVT1" event={event()} />);
    expect(screen.getByText("You’re on the list")).toBeInTheDocument();
    unmount();
    window.localStorage.clear();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2099-01-10T22:00:00Z"));
    render(<RsvpForm slug="EVT1" event={event()} />);
    expect(screen.getByText("RSVPs have closed.")).toBeInTheDocument();
  });

  it("says the event is full when places were set after the page was opened", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      server(null, new Response(JSON.stringify({ error: "full", left: 0 }), { status: 409 })),
    );
    // Opened while the event had no limit.
    render(<RsvpForm slug="EVT1" event={event()} />);
    await user.type(screen.getByRole("textbox", { name: /^Name/ }), "Ana");
    await user.type(screen.getByRole("textbox", { name: /^Email/ }), "ana@example.com");
    await user.click(screen.getByRole("button", { name: "Send RSVP" }));
    expect(await screen.findByText("This event is full.")).toBeInTheDocument();
  });

  it("says plainly when nothing was sent because this network sent too many today", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", server(null, new Response("{}", { status: 429 })));
    render(<RsvpForm slug="EVT1" event={event()} />);
    await user.type(screen.getByRole("textbox", { name: /^Name/ }), "Ana");
    await user.type(screen.getByRole("textbox", { name: /^Email/ }), "ana@example.com");
    await user.click(screen.getByRole("button", { name: "Send RSVP" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/wasn’t sent.*mobile data/);
  });

  it("sends nothing from the editor's preview", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    render(<RsvpForm slug="EVT1" event={event({ rsvpCapacity: "40" })} preview />);
    expect(screen.getByRole("button", { name: "Send RSVP" })).toBeDisabled();
    expect(fetch).not.toHaveBeenCalled();
  });
});
