import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { TeamPerson } from "@/lib/teams/access";

import { PeopleSwitch } from "./PeopleSwitch";

const TEAM: TeamPerson[] = [
  {
    userId: "olivia",
    email: "olivia@example.com",
    name: "Olivia Owner",
    avatarUrl: null,
    role: "owner",
    isMe: false,
  },
  {
    userId: "me",
    email: "me@example.com",
    name: "Victor Viewer",
    avatarUrl: null,
    role: "viewer",
    isMe: true,
  },
  {
    userId: "sam",
    email: "sam.lee@example.com",
    name: null,
    avatarUrl: null,
    role: "editor",
    isMe: false,
  },
];

describe("PeopleSwitch", () => {
  it("reads You, each teammate by first name, then Everyone", () => {
    render(<PeopleSwitch team={TEAM} current="self" />);
    const nav = within(screen.getByRole("navigation", { name: "Whose codes" }));
    expect(nav.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/codes",
      "/codes?workspace=olivia",
      "/codes?workspace=sam",
      "/codes?view=everyone",
    ]);
    for (const name of ["You", "Olivia", "sam.lee", "Everyone"]) {
      expect(nav.getByRole("link", { name })).toBeInTheDocument();
    }
    expect(nav.getByRole("link", { name: "You" })).toHaveAttribute("aria-current", "page");
  });

  it("marks the person or Everyone being shown", () => {
    const { rerender } = render(<PeopleSwitch team={TEAM} current="olivia" />);
    expect(screen.getByRole("link", { name: "Olivia" })).toHaveAttribute("aria-current", "page");
    rerender(<PeopleSwitch team={TEAM} current="everyone" />);
    expect(screen.getByRole("link", { name: "Everyone" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "You" })).not.toHaveAttribute("aria-current");
  });

  it("shows nothing to someone on their own", () => {
    const { container } = render(<PeopleSwitch team={[]} current="self" />);
    expect(container).toBeEmptyDOMElement();
  });
});
