// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({ getAdminSupabase: () => ({ rpc }) }));
const page = {
  type: "feedback",
  locked: false,
  content: {
    business: "Cafe",
    questions: [
      { text: "Food?", style: "stars" },
      { text: "Back?", style: "thumbs" },
    ],
  },
};
vi.mock("@/lib/supabase/public", () => ({ getPublicPage: vi.fn(async () => page) }));

import { POST } from "./route";

const post = (body: unknown) =>
  POST(
    new Request("https://ziplume.com/p/FB1/feedback", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
      },
      body: JSON.stringify(body),
    }) as never,
    { params: Promise.resolve({ slug: "FB1" }) } as never,
  );

describe("POST /p/[slug]/feedback", () => {
  beforeEach(() => {
    rpc.mockReset().mockResolvedValue({ data: true, error: null });
    process.env.SCAN_HASH_SECRET = "test-secret";
  });

  it("stores the page's questions with the values sent", async () => {
    const response = await post({ answers: [4, 1], comment: " Lovely ", contact: "" });
    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith(
      "submit_feedback_answers",
      expect.objectContaining({
        p_slug: "FB1",
        p_answers: [
          { question: "Food?", style: "stars", value: 4 },
          { question: "Back?", style: "thumbs", value: 1 },
        ],
        p_comment: "Lovely",
        p_contact: null,
      }),
    );
  });

  it("refuses values that don't fit the questions, storing nothing", async () => {
    for (const body of [{ answers: [4] }, { answers: [4, 2] }, { answers: ["4", 1] }, {}]) {
      expect((await post(body)).status, JSON.stringify(body)).toBe(400);
    }
    expect(rpc).not.toHaveBeenCalled();
  });

  it("says when today's limit is reached", async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    expect((await post({ answers: [4, 1] })).status).toBe(429);
  });

  it("stores an old form's single rating on a one-question page, and refuses it on three", async () => {
    const { getPublicPage } = await import("@/lib/supabase/public");
    vi.mocked(getPublicPage).mockResolvedValueOnce({
      type: "feedback",
      locked: false,
      content: { business: "Cafe", question: "How was it?" },
    } as never);
    expect((await post({ rating: 4 })).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith(
      "submit_feedback_answers",
      expect.objectContaining({
        p_answers: [{ question: "How was it?", style: "stars", value: 4 }],
      }),
    );
    rpc.mockClear();
    // The two-question page (the default here) can't take one rating.
    expect((await post({ rating: 4 })).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
});
