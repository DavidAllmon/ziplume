import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import type * as Env from "@/lib/env";

import { getAuthState } from "@/lib/auth/server";

import AppLayout from "./layout";

vi.mock("@/lib/env", async (original) => ({
  ...(await original<typeof Env>()),
  accountsEnabled: true,
}));
vi.mock("@/lib/auth/server", () => ({ getAuthState: vi.fn() }));
vi.mock("@/components/app/AppShell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div data-testid="shell">{children}</div>,
}));

describe("AppLayout", () => {
  it("shows no shell or team details before two-step verification is done", async () => {
    const rpc = vi.fn();
    const from = vi.fn();
    vi.mocked(getAuthState).mockResolvedValue({
      supabase: { rpc, from },
      user: { id: "u1", email: "david@example.com" },
      needsMfa: true,
    } as never);
    render(await AppLayout({ children: <p>Page</p> }));
    expect(screen.getByText("Page")).toBeInTheDocument();
    expect(screen.queryByTestId("shell")).toBeNull();
    expect(rpc).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });
});
