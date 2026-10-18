// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ getAdminSupabase: () => ({ rpc }) }));
const card = { type: "vcard", locked: false, content: { firstName: "Ana", shareDetails: true } };
vi.mock("@/lib/supabase/public", () => ({ getPublicPage: vi.fn(async () => card) }));

import { getPublicPage } from "@/lib/supabase/public";

const later = vi.fn();
// Read when called, not when mocked: vi.mock runs before this file's own lines.
vi.mock("@/lib/email/response-emails", () => ({
  sendResponseEmailsLater: (...args: unknown[]) => later(...args),
}));

import { POST } from "./route";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const post = (body: unknown, headers: Record<string, string> = {}) =>
  POST(
    new Request("https://ziplume.com/p/CARD1/share", {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": IPHONE, ...headers },
      body: JSON.stringify(body),
    }) as never,
    { params: Promise.resolve({ slug: "CARD1" }) } as never,
  );

describe("POST /p/[slug]/share", () => {
  beforeEach(() => {
    rpc.mockReset().mockResolvedValue({ data: true, error: null });
    process.env.SCAN_HASH_SECRET = "test-secret";
  });

  it("stores a name with a phone or an email", async () => {
    const response = await post({ name: " Ana ", phone: "", email: "ana@example.com", note: "Hi" });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(rpc).toHaveBeenCalledWith("submit_contact_share", {
      p_slug: "CARD1",
      p_name: "Ana",
      p_phone: null,
      p_email: "ana@example.com",
      p_note: "Hi",
      p_visitor_hash: expect.stringMatching(/^[0-9a-f]{32}$/),
    });
  });

  it("refuses details that aren't enough, storing nothing", async () => {
    for (const body of [
      { name: "", email: "ana@example.com" },
      { name: "Ana" },
      { name: "Ana", email: "ana@" },
      { name: "Ana", email: "ana@example.com", note: "x".repeat(501) },
      { name: 5, email: "ana@example.com" },
      [],
    ]) {
      expect((await post(body)).status, JSON.stringify(body)).toBe(400);
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("is only for unlocked Contact pages that ask, from this site", async () => {
    const ok = { name: "Ana", email: "ana@example.com" };
    vi.mocked(getPublicPage).mockResolvedValueOnce({
      ...card,
      content: { shareDetails: false },
    } as never);
    // Turned off (or paused) with a tab still open: closed, not "try again".
    const off = await post(ok);
    expect(off.status).toBe(409);
    expect(await off.json()).toEqual({ error: "closed" });
    vi.mocked(getPublicPage).mockResolvedValueOnce({ ...card, type: "coupon" } as never);
    expect((await post(ok)).status).toBe(404);
    vi.mocked(getPublicPage).mockResolvedValueOnce({ ...card, locked: true } as never);
    expect((await post(ok)).status).toBe(403);
    expect((await post(ok, { origin: "https://evil.example" })).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("quietly ignores the honeypot", async () => {
    const ok = { name: "Ana", email: "ana@example.com" };
    expect((await post({ ...ok, website: "spam.example" })).status).toBe(200);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("takes details from a chat app's own browser, which the scan bot check would skip", async () => {
    const telegram =
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36 Telegram-Android/11.2.3";
    const response = await post(
      { name: "Ana", email: "ana@example.com" },
      { "user-agent": telegram },
    );
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith(
      "submit_contact_share",
      expect.objectContaining({ p_name: "Ana" }),
    );
  });

  it("says when today's limit is reached", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    expect((await post({ name: "Ana", email: "ana@example.com" })).status).toBe(429);
  });

  it("emails the maker after storing the details, and not when nothing was stored", async () => {
    later.mockReset();
    await post({ name: "Ana", email: "ana@example.com" });
    expect(later).toHaveBeenCalledWith(expect.anything(), "CARD1");
    later.mockReset();
    rpc.mockResolvedValue({ data: false, error: null });
    await post({ name: "Ana", email: "ana@example.com" });
    expect(later).not.toHaveBeenCalled();
  });
});
