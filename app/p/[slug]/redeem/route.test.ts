// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ getAdminSupabase: () => ({ rpc }) }));
const coupon = { type: "coupon", locked: false, content: { offer: "20% OFF", markUsed: true } };
vi.mock("@/lib/supabase/public", () => ({ getPublicPage: vi.fn(async () => coupon) }));

import { getPublicPage } from "@/lib/supabase/public";

import { POST } from "./route";

const PHONE = "0123456789abcdef0123456789abcdef";
const post = (body: unknown, slug = "COUP1") =>
  POST(
    new Request(`https://ziplume.com/p/${slug}/redeem`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      },
      body: JSON.stringify(body),
    }) as never,
    { params: Promise.resolve({ slug }) } as never,
  );
const sentHash = () => (rpc.mock.calls.at(-1)![1] as { p_phone_hash: string }).p_phone_hash;

describe("POST /p/[slug]/redeem", () => {
  beforeEach(() => {
    rpc.mockReset().mockResolvedValue({ data: "used", error: null });
    process.env.SCAN_HASH_SECRET = "test-secret";
  });

  it("marks the coupon used by a one-way hash of the phone's ID, tied to the coupon", async () => {
    const response = await post({ phone: PHONE });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, already: false });
    const first = sentHash();
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).not.toContain(PHONE);
    await post({ phone: PHONE });
    expect(sentHash()).toBe(first);
    await post({ phone: PHONE }, "COUP2");
    expect(sentHash()).not.toBe(first);
  });

  it("says when this phone already used it, the offer is closed, or the limit is reached", async () => {
    rpc.mockResolvedValueOnce({ data: "already", error: null });
    expect(await (await post({ phone: PHONE })).json()).toEqual({ ok: true, already: true });
    rpc.mockResolvedValueOnce({ data: "closed", error: null });
    expect((await post({ phone: PHONE })).status).toBe(409);
    rpc.mockResolvedValueOnce({ data: "limited", error: null });
    expect((await post({ phone: PHONE })).status).toBe(429);
  });

  it("refuses an ID that isn't a phone's, or a coupon that doesn't take uses", async () => {
    for (const phone of ["", "xyz", PHONE.toUpperCase(), `${PHONE}0`, 42]) {
      expect((await post({ phone })).status, String(phone)).toBe(400);
    }
    vi.mocked(getPublicPage).mockResolvedValueOnce({
      ...coupon,
      content: { markUsed: false },
    } as never);
    expect((await post({ phone: PHONE })).status).toBe(409);
    expect(rpc).not.toHaveBeenCalled();
  });
});
