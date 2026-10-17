import { csvField } from "@/lib/analytics/shape";
import type { FeedbackAnswer, FeedbackQuestion, RatingStyle } from "@/lib/pages/feedback";
import { RATING_STYLES } from "@/lib/pages/feedback";

// The code page's feedback summary (spec item 36): an average for stars and faces, the share of
// thumbs up, and NPS for 0 to 10, one line per question as it was asked (ruling 3).

export interface ResponseRow {
  id: number;
  created_at: string;
  rating: number | null;
  answers: unknown;
  comment: string | null;
  contact: string | null;
}

export interface QuestionSummary {
  question: string;
  style: RatingStyle;
  count: number;
  headline: string;
  detail?: string;
}

const isAnswer = (a: unknown): a is FeedbackAnswer =>
  typeof a === "object" &&
  a !== null &&
  typeof (a as FeedbackAnswer).question === "string" &&
  RATING_STYLES.includes((a as FeedbackAnswer).style) &&
  typeof (a as FeedbackAnswer).value === "number";

/** A response's answers; a response from before questions could change is one star rating (ruling 4). */
export function answersOf(row: ResponseRow, questions: FeedbackQuestion[]): FeedbackAnswer[] {
  if (Array.isArray(row.answers)) return row.answers.filter(isAnswer);
  if (row.rating === null) return [];
  const first = questions.find((q) => q.text.trim());
  const question = first?.style === "stars" ? first.text.trim() : "Earlier star ratings";
  return [{ question, style: "stars", value: row.rating }];
}

const key = (a: { question: string; style: RatingStyle }) => `${a.style}|${a.question}`;
const pct = (n: number, of: number) => Math.round((100 * n) / of);

function headline(
  style: RatingStyle,
  values: number[],
): Pick<QuestionSummary, "headline" | "detail"> {
  const n = values.length;
  if (style === "thumbs")
    return { headline: `${pct(values.filter((v) => v === 1).length, n)}% thumbs up` };
  if (style === "scale") {
    const promoters = values.filter((v) => v >= 9).length;
    const detractors = values.filter((v) => v <= 6).length;
    return {
      // From the counts: two rounded shares can be one off (-34 for 1 of 3 against 2 of 3).
      headline: `NPS ${Math.round((100 * (promoters - detractors)) / n)}`,
      detail: `${pct(promoters, n)}% gave 9 or 10, ${pct(detractors, n)}% gave 0 to 6`,
    };
  }
  return { headline: `${(values.reduce((s, v) => s + v, 0) / n).toFixed(1)} out of 5` };
}

/** One line per question: the page's own questions first, in order, then any asked before. */
export function summarize(rows: ResponseRow[], questions: FeedbackQuestion[]): QuestionSummary[] {
  const groups = new Map<string, { question: string; style: RatingStyle; values: number[] }>();
  for (const q of questions.filter((q) => q.text.trim())) {
    groups.set(key({ question: q.text.trim(), style: q.style }), {
      question: q.text.trim(),
      style: q.style,
      values: [],
    });
  }
  for (const row of rows) {
    for (const a of answersOf(row, questions)) {
      const k = key(a);
      if (!groups.has(k)) groups.set(k, { question: a.question, style: a.style, values: [] });
      groups.get(k)!.values.push(a.value);
    }
  }
  return [...groups.values()]
    .filter((g) => g.values.length)
    .map((g) => ({
      question: g.question,
      style: g.style,
      count: g.values.length,
      ...headline(g.style, g.values),
    }));
}

const cell = (a: FeedbackAnswer | undefined) =>
  a === undefined ? "" : a.style === "thumbs" ? (a.value ? "up" : "down") : String(a.value);

/** Every response, a column per question as in the summary, then the comment and contact. */
export function feedbackCsv(rows: ResponseRow[], questions: FeedbackQuestion[]): string {
  const columns = summarize(rows, questions);
  const header = ["received_at", ...columns.map((c) => c.question), "comment", "contact"];
  const lines = rows.map((row) => {
    const answers = answersOf(row, questions);
    return [
      row.created_at,
      ...columns.map((c) => cell(answers.find((a) => key(a) === key(c)))),
      row.comment,
      row.contact,
    ]
      .map((v) => csvField(v))
      .join(",");
  });
  return [header.map((h) => csvField(h)).join(","), ...lines].join("\r\n");
}
