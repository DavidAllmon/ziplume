import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { JoinedTip } from "./JoinedTip";

describe("JoinedTip", () => {
  it("says whose team you joined and where to switch, once", async () => {
    window.history.replaceState(null, "", "/codes?joined=1");
    render(<JoinedTip ownerName="Olivia Owner" />);
    expect(
      screen.getByText("You’re in Olivia Owner’s team now. Switch between people here."),
    ).toBeInTheDocument();
    // A reload won't show it again: the address drops ?joined.
    expect(window.location.search).toBe("");
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText(/You’re in/)).toBeNull();
  });

  it("keeps the router's history state when it drops ?joined, so Back still works", () => {
    // A full page load (an Accept tapped before the page was ready) lands here with Next's
    // history state already in place.
    const state = { __NA: true, tree: "app" };
    window.history.replaceState(state, "", "/codes?joined=1");
    render(<JoinedTip ownerName="Olivia Owner" />);
    expect(window.location.search).toBe("");
    expect(window.history.state).toEqual(state);
  });
});
