// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

import { sendResponseEmails } from "./response-emails";

const row = {
  id: 7,
  kind: "rsvp",
  code_id: "11111111-1111-4111-8111-111111111111",
  code_name: "Summer party",
  owner_id: "33333333-3333-4333-8333-333333333333",
  to_email: "kai@example.com",
  to_name: "Kai",
  received_at: "2030-01-02T12:30:00Z",
  details: { name: "Ana", email: "ana@example.com", guests: 3, note: null },
};
const env = { BREVO_API_KEY: "key-123", SCAN_HASH_SECRET: "secret" };
const adminWith = (rows: unknown[]) => {
  const rpc = vi.fn(async (name: string, _args: unknown) => ({
    data: name === "claim_response_emails" ? rows : null,
    error: null,
  }));
  return { rpc, admin: { rpc } as never };
};
const brevo = (status: number) => vi.fn<typeof fetch>(async () => new Response("{}", { status }));

describe("sendResponseEmails", () => {
  it("emails each waiting response to the maker, with one-click unsubscribe, and records it", async () => {
    const { admin, rpc } = adminWith([row]);
    const fetcher = brevo(201);
    expect(await sendResponseEmails(admin, "EVT1", { env, fetcher })).toBe(1);
    expect(rpc).toHaveBeenCalledWith("claim_response_emails", { p_slug: "EVT1" });
    const body = JSON.parse(String(fetcher.mock.calls[0]![1]?.body));
    expect(body.to).toEqual([{ email: "kai@example.com" }]);
    expect(body.subject).toBe("New RSVP for “Summer party”");
    expect(body.headers).toEqual({
      "List-Unsubscribe": expect.stringMatching(
        /^<.+\/email\/responses-off\/stop\?c=1111.+&t=.+>$/,
      ),
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
    expect(rpc).toHaveBeenCalledWith("finish_response_email", { p_id: 7, p_sent: true });
  });

  it("records a failure when Brevo refuses, or the response is gone, and never throws", async () => {
    const refused = adminWith([row]);
    expect(await sendResponseEmails(refused.admin, "EVT1", { env, fetcher: brevo(500) })).toBe(0);
    expect(refused.rpc).toHaveBeenCalledWith("finish_response_email", { p_id: 7, p_sent: false });

    const gone = adminWith([{ ...row, details: null }]);
    const fetcher = brevo(201);
    expect(await sendResponseEmails(gone.admin, "EVT1", { env, fetcher })).toBe(0);
    expect(fetcher).not.toHaveBeenCalled();
    expect(gone.rpc).toHaveBeenCalledWith("finish_response_email", { p_id: 7, p_sent: false });

    const timeout = adminWith([row]);
    const offline = vi.fn<typeof fetch>(async () => {
      throw new Error("timeout");
    });
    expect(await sendResponseEmails(timeout.admin, "EVT1", { env, fetcher: offline })).toBe(0);
  });

  it("does nothing on a server without a Brevo key", async () => {
    const { admin, rpc } = adminWith([row]);
    expect(await sendResponseEmails(admin, "EVT1", { env: { SCAN_HASH_SECRET: "secret" } })).toBe(
      0,
    );
    expect(rpc).not.toHaveBeenCalled();
  });
});
