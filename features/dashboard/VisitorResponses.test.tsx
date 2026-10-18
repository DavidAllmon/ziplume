import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";

import { ContactShares } from "./ContactShares";
import { CouponUses } from "./CouponUses";
import { EventRsvps } from "./EventRsvps";

let result: { data: unknown[]; count: number } = { data: [], count: 0 };
const query = {
  select: () => query,
  eq: () => query,
  order: () => query,
  limit: async () => ({ data: result.data, error: null, count: result.count }),
};
const rpc = vi.fn(async (_name: string, _args: unknown) => ({ data: 5, error: null }));
vi.mock("@/lib/supabase/client", () => ({
  getBrowserSupabase: () => ({ from: () => query, rpc }),
}));

const at = "2030-01-02T12:00:00Z";
const wrap = (node: ReactNode) => render(<ToastProvider>{node}</ToastProvider>);

describe("what visitors sent, on the code page", () => {
  beforeEach(() => {
    result = { data: [], count: 0 };
  });

  it("lists shared details with ways to reach them, and a CSV; viewers can't delete", async () => {
    result = {
      data: [
        {
          id: 1,
          code_id: "c",
          created_at: at,
          name: "Ben",
          phone: "+1 555 0100",
          email: null,
          note: "Call me",
        },
      ],
      count: 1,
    };
    wrap(<ContactShares codeId="c" content={{ shareDetails: true }} canEdit={false} />);
    expect(await screen.findByText("Ben")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "+1 555 0100" })).toHaveAttribute(
      "href",
      "tel:+15550100",
    );
    expect(screen.getByText("Call me")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /CSV/ })).toHaveAttribute(
      "download",
      "shared-details.csv",
    );
    expect(screen.queryByRole("button", { name: /Delete/ })).toBeNull();
  });

  it("isn't shown for a page that doesn't ask and has nothing", async () => {
    wrap(<ContactShares codeId="c" content={{}} canEdit />);
    // After the (empty) list has loaded.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText("Shared details")).toBeNull();
  });

  it("counts every coupon use, not just the ones loaded", async () => {
    result = { data: [{ id: 9, code_id: "c", created_at: at }], count: 1234 };
    wrap(<CouponUses codeId="c" content={{ markUsed: true }} />);
    expect(await screen.findByText("1,234 used")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /CSV/ })).toHaveAttribute(
      "download",
      "coupon-uses.csv",
    );
  });

  it("shows the places taken, and each RSVP with its guests", async () => {
    result = {
      data: [
        {
          id: 2,
          code_id: "c",
          created_at: at,
          name: "Ana",
          email: "ana@example.com",
          guests: 3,
          note: null,
        },
        {
          id: 1,
          code_id: "c",
          created_at: at,
          name: "Ben",
          email: "ben@example.com",
          guests: 2,
          note: "Vegan",
        },
      ],
      count: 2,
    };
    wrap(<EventRsvps codeId="c" content={{ rsvp: true, rsvpCapacity: "8" }} canEdit />);
    expect(await screen.findByText("5 of 8 places taken")).toBeInTheDocument();
    expect(rpc).toHaveBeenCalledWith("rsvp_guests", { p_code: "c" });
    expect(screen.getByText("3 guests")).toBeInTheDocument();
    expect(screen.getByText("Vegan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete Ana’s RSVP" })).toBeInTheDocument();
  });
});
