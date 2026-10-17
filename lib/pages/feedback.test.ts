import { describe, expect, it } from "vitest";

import { buildAnswers, reviewLabel, validValue } from "./feedback";
import { sanitizePage } from "./sanitize";
import { PAGE_DEFAULTS } from "./types";
import { validatePage } from "./validate";

const questions = [
  { text: "How was the food?", style: "stars" as const },
  { text: "Would you come back?", style: "thumbs" as const },
  { text: "How likely are you to recommend us?", style: "scale" as const },
];

describe("feedback questions", () => {
  it("reads an old page's question as one star question, with no review link", () => {
    const page = sanitizePage("feedback", { business: "Cafe", question: "How was your visit?" });
    expect(page.questions).toEqual([{ text: "How was your visit?", style: "stars" }]);
    expect(page.reviewUrl).toBe("");
    expect(page).not.toHaveProperty("question");
    expect(
      sanitizePage("feedback", { questions: [{ text: "Q", style: "hearts" }] }).questions,
    ).toEqual([{ text: "Q", style: "stars" }]);
  });

  it("keeps each value in its style's range", () => {
    expect([1, 5].every((v) => validValue("stars", v))).toBe(true);
    expect([0, 6, 4.5].some((v) => validValue("faces", v))).toBe(false);
    expect([0, 1].every((v) => validValue("thumbs", v))).toBe(true);
    expect(validValue("thumbs", 2)).toBe(false);
    expect([0, 10].every((v) => validValue("scale", v))).toBe(true);
    expect(validValue("scale", 11)).toBe(false);
  });

  it("builds the answers from the page's own questions, or refuses ones that don't fit", () => {
    expect(buildAnswers(questions, [4, 1, 9])).toEqual([
      { question: "How was the food?", style: "stars", value: 4 },
      { question: "Would you come back?", style: "thumbs", value: 1 },
      { question: "How likely are you to recommend us?", style: "scale", value: 9 },
    ]);
    expect(buildAnswers(questions, [4, 1])).toBeNull();
    expect(buildAnswers(questions, [4, 2, 9])).toBeNull();
    expect(buildAnswers(questions, ["4", 1, 9])).toBeNull();
    expect(buildAnswers(questions, "4,1,9")).toBeNull();
    // A question with no text isn't asked, so it isn't answered.
    expect(buildAnswers([{ text: " ", style: "stars" }, questions[0]!], [5])).toEqual([
      { question: "How was the food?", style: "stars", value: 5 },
    ]);
  });

  it("names the review site from its link", () => {
    expect(reviewLabel("https://g.page/r/abc/review")).toBe("Share it on Google");
    expect(reviewLabel("https://search.google.com/local/writereview?placeid=x")).toBe(
      "Share it on Google",
    );
    expect(reviewLabel("https://www.yelp.com/writeareview/biz/x")).toBe("Share it on Yelp");
    expect(reviewLabel("https://www.tripadvisor.co.uk/UserReview-x")).toBe(
      "Share it on Tripadvisor",
    );
    expect(reviewLabel("https://www.trustpilot.com/evaluate/x")).toBe("Share it on Trustpilot");
    expect(reviewLabel("https://example.com/review")).toBe("Leave us a review");
    expect(reviewLabel("")).toBeNull();
  });

  it("needs a question, and checks the review link", () => {
    const page = { ...PAGE_DEFAULTS.feedback(), business: "Cafe" };
    expect(
      validatePage("feedback", { ...page, questions: [{ text: "", style: "stars" }] }),
    ).toEqual({
      "questions.0.text": "Add a question",
    });
    expect(validatePage("feedback", { ...page, reviewUrl: "not a link" })).toEqual({
      reviewUrl: "Enter a web address, like example.com",
    });
  });
});
