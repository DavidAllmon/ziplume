import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/components/ui/Toast";

import { FeedbackResponses } from "./FeedbackResponses";

const rows = [
  {
    id: 2,
    code_id: "c",
    created_at: "2030-01-02T12:00:00Z",
    rating: 4,
    answers: [
      { question: "Food?", style: "stars", value: 4 },
      { question: "Back?", style: "thumbs", value: 1 },
    ],
    comment: "Lovely",
    contact: null,
    visitor_hash: "v",
  },
  // From before pages could ask several questions: one star rating.
  {
    id: 1,
    code_id: "c",
    created_at: "2030-01-01T12:00:00Z",
    rating: 2,
    answers: null,
    comment: null,
    contact: null,
    visitor_hash: "v",
  },
];
const query = {
  select: () => query,
  eq: () => query,
  order: () => query,
  limit: async () => ({ data: rows, error: null }),
};
vi.mock("@/lib/supabase/client", () => ({ getBrowserSupabase: () => ({ from: () => query }) }));

describe("FeedbackResponses", () => {
  it("sums up each question in its style, lists each answer, and offers a CSV", async () => {
    render(
      <ToastProvider>
        <FeedbackResponses
          codeId="c"
          content={{
            business: "Cafe",
            questions: [
              { text: "Food?", style: "stars" },
              { text: "Back?", style: "thumbs" },
            ],
          }}
        />
      </ToastProvider>,
    );
    // The older star rating counts toward the first question, still a star question.
    expect(await screen.findByText("3.0 out of 5")).toBeInTheDocument();
    expect(screen.getByText("100% thumbs up")).toBeInTheDocument();
    expect(screen.getByText("Thumbs up")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "4 out of 5 stars" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /CSV/ })).toHaveAttribute("download", "feedback.csv");
  });
});
