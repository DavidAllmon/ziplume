import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";

import { ResponseEmails, takesResponses } from "./ResponseEmails";

const rpc = vi.fn(
  async (
    _name: string,
    _args: unknown,
  ): Promise<{ data: null; error: { message: string } | null }> => ({
    data: null,
    error: null,
  }),
);
vi.mock("@/lib/supabase/client", () => ({ getBrowserSupabase: () => ({ rpc }) }));

const CODE = "11111111-1111-4111-8111-111111111111";
const show = (initial = false, emailReady = true) =>
  render(
    <ToastProvider>
      <ResponseEmails codeId={CODE} initial={initial} emailReady={emailReady} />
    </ToastProvider>,
  );

describe("ResponseEmails", () => {
  it("switches the maker's emails on and off", async () => {
    const user = userEvent.setup();
    show();
    const toggle = screen.getByRole("switch", { name: "Email me new responses" });
    await user.click(toggle);
    expect(rpc).toHaveBeenLastCalledWith("set_response_emails", { p_code: CODE, p_on: true });
    expect(toggle).toBeChecked();
    expect(screen.getByText(/up to 50 a day/)).toBeInTheDocument();
  });

  it("goes back when the change doesn't save", async () => {
    const user = userEvent.setup();
    rpc.mockResolvedValueOnce({ data: null, error: { message: "no" } });
    show(true);
    const toggle = screen.getByRole("switch", { name: "Email me new responses" });
    await user.click(toggle);
    expect(toggle).toBeChecked();
    expect(
      await screen.findByText("Emails couldn’t be changed. Please try again."),
    ).toBeInTheDocument();
  });

  it("says so when this server can't send email", () => {
    show(false, false);
    expect(screen.getByText(/Email isn’t set up on this server/)).toBeInTheDocument();
  });
});

describe("takesResponses", () => {
  it("is for feedback, and for Contact and Event pages that take responses", () => {
    expect(takesResponses("feedback", {}, false)).toBe(true);
    expect(takesResponses("vcard", { shareDetails: true }, false)).toBe(true);
    expect(takesResponses("vcard", {}, false)).toBe(false);
    expect(takesResponses("event", { rsvp: true }, false)).toBe(true);
    expect(takesResponses("event", {}, false)).toBe(false);
    expect(takesResponses("coupon", { markUsed: true }, false)).toBe(false);
    // Already on: shown, so it can be turned off.
    expect(takesResponses("vcard", {}, true)).toBe(true);
  });
});
