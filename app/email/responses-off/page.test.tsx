import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { offLinkCode } from "@/lib/email/response-links";

import ResponsesOffPage from "./page";

vi.mock("@/lib/supabase/admin", () => ({ getAdminSupabase: () => ({}) }));
vi.mock("@/lib/email/response-links", () => ({ offLinkCode: vi.fn() }));

const CODE = "11111111-1111-4111-8111-111111111111";
const open = async (c: string, t: string) => {
  process.env.SCAN_HASH_SECRET = "secret";
  render(await ResponsesOffPage({ searchParams: Promise.resolve({ c, t }) } as never));
};

describe("the response emails off page", () => {
  it("asks before turning the emails off, and opening it changes nothing", async () => {
    vi.mocked(offLinkCode).mockResolvedValue({
      id: CODE,
      name: "Summer party",
      on: true,
      ownerId: "o",
    });
    await open(CODE, "tok");
    expect(
      screen.getByRole("heading", { name: "Stop emails for “Summer party”?" }),
    ).toBeInTheDocument();
    const button = screen.getByRole("button", { name: "Turn off emails" });
    expect(button.closest("form")).toHaveAttribute(
      "action",
      `/email/responses-off/stop?c=${CODE}&t=tok`,
    );
    expect(button.closest("form")).toHaveAttribute("method", "post");
  });

  it("says when they're already off, or the link doesn't work", async () => {
    vi.mocked(offLinkCode).mockResolvedValue({
      id: CODE,
      name: "Summer party",
      on: false,
      ownerId: "o",
    });
    await open(CODE, "tok");
    expect(screen.getByRole("heading", { name: "Emails are off" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Turn off emails" })).toBeNull();
  });

  it("says the link doesn't work when it isn't signed for the code", async () => {
    vi.mocked(offLinkCode).mockResolvedValue(null);
    await open(CODE, "bad");
    expect(screen.getByRole("heading", { name: "This link doesn’t work" })).toBeInTheDocument();
  });

  it("wraps a long code name instead of scrolling sideways on a phone", async () => {
    vi.mocked(offLinkCode).mockResolvedValue({
      id: CODE,
      name: "x".repeat(120),
      on: false,
      ownerId: "o",
    });
    await open(CODE, "tok");
    // The whole card wraps, the name in its sentence included.
    expect(screen.getByRole("heading", { name: "Emails are off" }).parentElement).toHaveClass(
      "[overflow-wrap:anywhere]",
    );
  });
});
