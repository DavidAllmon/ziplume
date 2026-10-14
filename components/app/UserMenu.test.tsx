import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { UserMenu } from "./UserMenu";

const USER = { id: "u1", email: "david@example.com", name: "David Allmon", avatarUrl: null };

describe("UserMenu", () => {
  it("signs out from the keyboard", async () => {
    const submitted = vi.fn((event: Event) => event.preventDefault());
    document.addEventListener("submit", submitted);
    render(<UserMenu user={USER} />);
    await userEvent.tab();
    expect(screen.getByRole("button", { name: /David Allmon/ })).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toHaveAttribute("data-focus");
    await userEvent.keyboard("{Enter}");
    expect(submitted).toHaveBeenCalledTimes(1);
    document.removeEventListener("submit", submitted);
  });
});
