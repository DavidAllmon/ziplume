import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type * as Env from "@/lib/env";

import { AccountMenu } from "./AccountMenu";

vi.mock("@/lib/env", async (original) => ({
  ...(await original<typeof Env>()),
  accountsEnabled: true,
}));
vi.mock("./useSession", () => ({
  useSession: () => ({ user: { id: "u1", email: "david@example.com" }, loading: false }),
}));
vi.mock("@/features/profile/useProfile", () => ({ useProfile: () => null }));

describe("AccountMenu", () => {
  it("signs out from the keyboard", async () => {
    const submitted = vi.fn((event: Event) => event.preventDefault());
    document.addEventListener("submit", submitted);
    render(<AccountMenu />);
    await userEvent.click(screen.getByRole("button", { name: "Account menu" }));
    await userEvent.keyboard("{End}");
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toHaveAttribute("data-focus");
    await userEvent.keyboard("{Enter}");
    expect(submitted).toHaveBeenCalledTimes(1);
    document.removeEventListener("submit", submitted);
  });
});
