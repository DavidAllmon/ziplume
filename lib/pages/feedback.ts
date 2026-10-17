import { safeHref } from "./urls";

// Feedback questions and their answers (spec items 35-37).

export const RATING_STYLES = ["stars", "faces", "thumbs", "scale"] as const;
export type RatingStyle = (typeof RATING_STYLES)[number];

export const STYLE_LABEL: Record<RatingStyle, string> = {
  stars: "Stars, 1 to 5",
  faces: "Faces, 1 to 5",
  thumbs: "Thumbs up or down",
  scale: "0 to 10",
};

export interface FeedbackQuestion {
  text: string;
  style: RatingStyle;
}

/** One answer as stored: the question as it was asked, its style, and the value given. */
export interface FeedbackAnswer {
  question: string;
  style: RatingStyle;
  value: number;
}

/** Stars and faces 1-5, thumbs 1 (up) or 0 (down), and 0-10. */
export const validValue = (style: RatingStyle, value: unknown): boolean =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  (style === "thumbs"
    ? value === 0 || value === 1
    : style === "scale"
      ? value >= 0 && value <= 10
      : value >= 1 && value <= 5);

/**
 * The answers to store: the page's own questions (those with text) with the values sent, in
 * order. Null when the values don't match the questions, so nothing is stored (ruling 2).
 */
export function buildAnswers(
  questions: FeedbackQuestion[],
  values: unknown,
): FeedbackAnswer[] | null {
  const asked = questions.filter((q) => q.text.trim());
  if (!asked.length || !Array.isArray(values) || values.length !== asked.length) return null;
  const answers = asked.map((q, i) => ({
    question: q.text.trim().slice(0, 200),
    style: q.style,
    value: values[i] as number,
  }));
  return answers.every((a) => validValue(a.style, a.value)) ? answers : null;
}

const SITES: [RegExp, string][] = [
  [/(^|\.)(google\.[a-z.]+|g\.page|goo\.gl)$/, "Google"],
  [/(^|\.)yelp\.[a-z.]+$/, "Yelp"],
  [/(^|\.)tripadvisor\.[a-z.]+$/, "Tripadvisor"],
  [/(^|\.)facebook\.com$/, "Facebook"],
  [/(^|\.)trustpilot\.com$/, "Trustpilot"],
];

/** The thank-you screen's review button: "Share it on Google", or null without a link (spec 35). */
export function reviewLabel(url: string): string | null {
  const href = safeHref(url);
  if (!href) return null;
  const host = new URL(href).hostname;
  const site = SITES.find(([pattern]) => pattern.test(host))?.[1];
  return site ? `Share it on ${site}` : "Leave us a review";
}
