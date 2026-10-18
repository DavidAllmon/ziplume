// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ getAdminSupabase: () => ({ rpc }) }));
const event = {
  type: "event",
  locked: false,
  content: { title: "Launch", rsvp: true, rsvpCapacity: "4" },
};
vi.mock("@/lib/supabase/public", () => ({ getPublicPage: vi.fn(async () => event) }));

import { getPublicPage } from "@/lib/supabase/public";

const later = vi.fn();
// Read when called, not when mocked: vi.mock runs before this file's own lines.
vi.mock("@/lib/email/response-emails", () => ({
  sendResponseEmailsLater: (...args: unknown[]) => later(...args),
}));

import { GET, POST } from "./route";

const context = { params: Promise.resolve({ slug: "EVT1" }) } as never;
const url = "https://ziplume.com/p/EVT1/rsvp";
const post = (body: unknown) =>
  POST(
    new Request(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      },
      body: JSON.stringify(body),
    }) as never,
    context,
  );
const ok = { name: "Ana", email: "ana@example.com", guests: 2, note: "" };
// Each function's answer, by name.
const answers = (byName: Record<string, unknown>) =>
  rpc.mockImplementation(async (name: string) => ({ data: byName[name] ?? null, error: null }));

describe("/p/[slug]/rsvp", () => {
  beforeEach(() => {
    rpc.mockReset();
    answers({ submit_rsvp: "listed", rsvp_places_left: 2 });
    process.env.SCAN_HASH_SECRET = "test-secret";
  });

  it("tells the form how many places are left, or none for no limit", async () => {
    const response = await GET(new Request(url) as never, context);
    expect(await response.json()).toEqual({ left: 2 });
    expect(response.headers.get("cache-control")).toBe("no-store");
    answers({ rsvp_places_left: null });
    expect(await (await GET(new Request(url) as never, context)).json()).toEqual({ left: null });
    vi.mocked(getPublicPage).mockResolvedValueOnce({ ...event, content: { rsvp: false } } as never);
    expect((await GET(new Request(url) as never, context)).status).toBe(404);
  });

  it("puts the visitor on the list", async () => {
    expect((await post(ok)).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("submit_rsvp", {
      p_slug: "EVT1",
      p_name: "Ana",
      p_email: "ana@example.com",
      p_guests: 2,
      p_note: null,
      p_visitor_hash: expect.stringMatching(/^[0-9a-f]{32}$/),
    });
    // The same answer as a new RSVP, so nobody can find out who's coming by trying emails.
    answers({ submit_rsvp: "already" });
    expect(await (await post(ok)).json()).toEqual({ ok: true });
  });

  it("says RSVPs are closed when the form was turned off with a tab still open", async () => {
    vi.mocked(getPublicPage).mockResolvedValueOnce({ ...event, content: { rsvp: false } } as never);
    const response = await post(ok);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "closed" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("says how many places are left when there aren't enough", async () => {
    answers({ submit_rsvp: "full", rsvp_places_left: 1 });
    const response = await post(ok);
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "full", left: 1 });
    answers({ submit_rsvp: "closed" });
    expect(await (await post(ok)).json()).toEqual({ error: "closed" });
    answers({ submit_rsvp: "limited" });
    expect((await post(ok)).status).toBe(429);
  });

  it("refuses an RSVP that isn't complete, storing nothing", async () => {
    for (const body of [
      { ...ok, name: "" },
      { ...ok, email: "ana@" },
      { ...ok, guests: 0 },
      { ...ok, guests: 11 },
      { ...ok, guests: 2.5 },
      { ...ok, guests: "3" },
      { ...ok, note: "x".repeat(501) },
    ]) {
      expect((await post(body)).status, JSON.stringify(body)).toBe(400);
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("emails the maker about a new RSVP, and not for an email already on the list", async () => {
    later.mockReset();
    await post(ok);
    expect(later).toHaveBeenCalledWith(expect.anything(), "EVT1");
    later.mockReset();
    answers({ submit_rsvp: "already" });
    await post(ok);
    expect(later).not.toHaveBeenCalled();
  });
});
