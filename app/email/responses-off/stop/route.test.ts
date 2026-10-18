// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const update = vi.fn();
const lookup = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Summer party",
  on: true,
  ownerId: "o1",
};
vi.mock("@/lib/supabase/admin", () => ({
  getAdminSupabase: () => ({
    from: () => ({
      update: (patch: unknown) => ({ eq: () => ({ eq: async () => update(patch) }) }),
    }),
  }),
}));
vi.mock("@/lib/email/response-links", () => ({ offLinkCode: vi.fn() }));

import { offLinkCode } from "@/lib/email/response-links";

import { POST } from "./route";

const CODE = lookup.id;
const stop = (body: string) =>
  POST(
    new Request(`https://ziplume.com/email/responses-off/stop?c=${CODE}&t=tok`, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
    }) as never,
  );

describe("POST /email/responses-off/stop", () => {
  beforeEach(() => {
    update.mockReset().mockReturnValue({ error: null });
    process.env.SCAN_HASH_SECRET = "secret";
  });

  it("turns the emails off and goes back to the page, for the page's button", async () => {
    vi.mocked(offLinkCode).mockResolvedValue(lookup);
    const response = await stop("from=page");
    expect(update).toHaveBeenCalledWith({ notify_responses: false });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toMatch(
      new RegExp(`/email/responses-off\\?c=${CODE}&t=tok$`),
    );
  });

  it("turns them off for a mail app's one-click unsubscribe", async () => {
    vi.mocked(offLinkCode).mockResolvedValue(lookup);
    const response = await stop("List-Unsubscribe=One-Click");
    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ notify_responses: false });
  });

  it("changes nothing for a link that isn't signed for the code", async () => {
    vi.mocked(offLinkCode).mockResolvedValue(null);
    expect((await stop("from=page")).status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });
});
