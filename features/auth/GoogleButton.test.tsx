import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type * as Env from "@/lib/env";

import { GoogleButton } from "./GoogleButton";

const signInWithOAuth = vi.hoisted(() => vi.fn());
const goTo = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/client", () => ({
  getBrowserSupabase: () => ({ auth: { signInWithOAuth } }),
}));
vi.mock("@/lib/navigate", () => ({ goTo }));
vi.mock("@/lib/env", async (importOriginal) => ({
  ...(await importOriginal<typeof Env>()),
  SITE_URL: "https://ziplume.example",
  SUPABASE_URL: "https://project.example",
}));

beforeEach(() => {
  signInWithOAuth.mockReset();
  goTo.mockReset();
});

describe("Continue with Google", () => {
  it("starts sign-in on the site's own address", async () => {
    signInWithOAuth.mockResolvedValue({
      data: {
        provider: "google",
        url: "https://project.example/auth/v1/authorize?provider=google&code_challenge=abc",
      },
      error: null,
    });
    render(<GoogleButton next="/codes" onError={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "google",
        options: expect.objectContaining({ skipBrowserRedirect: true }),
      }),
    );
    expect(goTo).toHaveBeenCalledWith(
      "https://ziplume.example/auth/v1/authorize?provider=google&code_challenge=abc",
    );
  });

  it("shows the problem and stays put when sign-in can't start", async () => {
    signInWithOAuth.mockResolvedValue({
      data: { provider: "google", url: null },
      error: { name: "AuthApiError", message: "Unsupported provider", status: 400 },
    });
    const onError = vi.fn();
    render(<GoogleButton next="/codes" onError={onError} />);
    await userEvent.click(screen.getByRole("button", { name: "Continue with Google" }));
    expect(onError).toHaveBeenCalledOnce();
    expect(goTo).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeEnabled();
  });
});
