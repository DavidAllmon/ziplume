import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { saveDraft } from "../draft";
import { initialCreateState } from "../state";
import { TypeGallery } from "./TypeGallery";

beforeEach(() => window.localStorage.clear());

describe("TypeGallery", () => {
  it("links every type to its editor, keeping the folder", () => {
    render(<TypeGallery userId="u1" folderId="f1" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "What do you want to make?" }),
    ).toBeInTheDocument();
    // jsdom has no layout, so the name and description run together in the accessible name.
    expect(screen.getByRole("link", { name: /^Link\s*Send people/ })).toHaveAttribute(
      "href",
      "/codes/new?type=url&folder=f1",
    );
    expect(screen.getByRole("link", { name: /^Contact page/ })).toHaveAttribute(
      "href",
      "/codes/new?type=vcard&folder=f1",
    );
    expect(screen.getByRole("link", { name: /^Contact card/ })).toHaveAttribute(
      "href",
      "/codes/new?type=contact&folder=f1",
    );
    expect(screen.getByRole("link", { name: "Make many at once" })).toHaveAttribute(
      "href",
      "/codes/bulk?folder=f1",
    );
  });

  it("filters as you search, and says when nothing matches", async () => {
    const user = userEvent.setup();
    render(<TypeGallery userId="u1" folderId={null} />);
    await user.type(screen.getByLabelText("Search types"), "menu");
    expect(screen.getByRole("link", { name: /^Menu/ })).toHaveAttribute(
      "href",
      "/codes/new?type=menu",
    );
    expect(screen.queryByRole("link", { name: /^Wi-Fi/ })).toBeNull();
    await user.clear(screen.getByLabelText("Search types"));
    await user.type(screen.getByLabelText("Search types"), "zzz");
    expect(screen.getByText("No types match “zzz”.")).toBeInTheDocument();
  });

  it("offers an unfinished code to continue, or to discard", async () => {
    const user = userEvent.setup();
    saveDraft("u1", initialCreateState({ type: "menu", folderId: null }));
    render(<TypeGallery userId="u1" folderId={null} />);
    const banner = await screen.findByRole("region", { name: "Unfinished code" });
    expect(banner).toHaveTextContent("You have an unfinished Menu on this device.");
    expect(screen.getByRole("link", { name: "Continue" })).toHaveAttribute(
      "href",
      "/codes/new?type=menu&resume=1",
    );
    await user.click(screen.getByRole("button", { name: "Discard" }));
    expect(screen.queryByRole("region", { name: "Unfinished code" })).toBeNull();
    expect(window.localStorage.getItem("ziplume:draft:v2:u1")).toBeNull();
  });

  it("draws each page type on its own theme", () => {
    render(<TypeGallery userId="u1" folderId={null} />);
    const tile = screen.getByRole("link", { name: /^Event/ });
    expect(tile.querySelector("[data-sketch]")).toHaveAttribute("data-sketch", "grape");
    expect(screen.getByRole("link", { name: /^Wi-Fi/ }).querySelector("[data-sketch]")).toBeNull();
  });
});
