import { describe, expect, it } from "vitest";

import { answersOf, feedbackCsv, summarize } from "./summary";

const questions = [
  { text: "Food?", style: "stars" as const },
  { text: "Back?", style: "thumbs" as const },
  { text: "Recommend?", style: "scale" as const },
];
const row = (
  values: [number, number, number] | null,
  rating: number | null = null,
  extra = {},
) => ({
  id: Math.random(),
  created_at: "2030-01-01T12:00:00Z",
  rating,
  answers:
    values && questions.map((q, i) => ({ question: q.text, style: q.style, value: values[i] })),
  comment: null,
  contact: null,
  ...extra,
});

describe("feedback summary", () => {
  it("averages stars, counts thumbs up, and scores 0 to 10 as NPS, per question", () => {
    const rows = [row([5, 1, 10]), row([3, 0, 9]), row([4, 1, 6]), row([4, 1, 7])];
    expect(summarize(rows, questions)).toEqual([
      { question: "Food?", style: "stars", count: 4, headline: "4.0 out of 5" },
      { question: "Back?", style: "thumbs", count: 4, headline: "75% thumbs up" },
      {
        question: "Recommend?",
        style: "scale",
        count: 4,
        headline: "NPS 25",
        detail: "50% gave 9 or 10, 25% gave 0 to 6",
      },
    ]);
  });

  it("scores NPS from -100 to 100", () => {
    const scale = [{ text: "Recommend?", style: "scale" as const }];
    const nps = (values: number[]) =>
      summarize(
        values.map((v) => ({
          id: v,
          created_at: "",
          rating: null,
          answers: [{ question: "Recommend?", style: "scale", value: v }],
          comment: null,
          contact: null,
        })),
        scale,
      )[0]!.headline;
    expect(nps([10, 9])).toBe("NPS 100");
    expect(nps([0, 6])).toBe("NPS -100");
    expect(nps([7, 8])).toBe("NPS 0");
  });

  it("counts an older star rating toward the first question while it's still stars", () => {
    expect(answersOf(row(null, 4), questions)).toEqual([
      { question: "Food?", style: "stars", value: 4 },
    ]);
    expect(answersOf(row(null, 4), [{ text: "Back?", style: "thumbs" }])).toEqual([
      { question: "Earlier star ratings", style: "stars", value: 4 },
    ]);
  });

  it("keeps a reworded question's answers apart, after the page's own questions", () => {
    const reworded = {
      id: 1,
      created_at: "",
      rating: 5,
      answers: [{ question: "Food quality?", style: "stars", value: 5 }],
      comment: null,
      contact: null,
    };
    const summary = summarize([row([4, 1, 9]), reworded], questions);
    expect(summary.map((s) => s.question)).toEqual([
      "Food?",
      "Back?",
      "Recommend?",
      "Food quality?",
    ]);
  });

  it("writes a CSV with a column per question, quoting what needs it", () => {
    const csv = feedbackCsv([row([5, 1, 10], null, { comment: 'Great, "really"' })], questions);
    expect(csv.split("\r\n")[0]).toBe("received_at,Food?,Back?,Recommend?,comment,contact");
    expect(csv.split("\r\n")[1]).toBe('2030-01-01T12:00:00Z,5,up,10,"Great, ""really""",');
  });
});
