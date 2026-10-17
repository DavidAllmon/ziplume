# Page enhancements, Release 4c: Feedback — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- Feedback pages ask up to 3 questions, each rated with stars, faces, thumbs up or down, or 0–10.
- The thank-you screen offers "Share it on Google" (or another review site) to everyone.
- The code page's summary adapts to each question's style.

**Architecture:**
- **Database:** one migration.
  - `feedback_responses` gains `answers jsonb`, and `rating` becomes optional.
  - A new `submit_feedback_answers` function stores up to 3 answers, each checked for its style, with the same active-page check and daily limit as today.
  - The old `submit_feedback` stays untouched, so the live site keeps working between applying the migration and the deploy.
- **The visitor's form** sends only the values. The server route takes each question's wording and style from the page itself, so a stored answer always says what was asked.
- **Pure helpers, each tested:**
  - `lib/pages/feedback.ts`: styles, value ranges, building answers, the review button's label;
  - `lib/feedback/summary.ts`: per-question averages, percent up, and NPS.

**Tech Stack:**
- Next.js 16, React 19, Supabase (self-hosted, through the private SQL bridge), PGlite migration tests, Vitest, Playwright 1.56.
- No new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-16-ziplume-page-enhancements-design.md`, section 7 (items 35–37), section 9 (Release 4's migration), section 10 ruling 1, and section 3. Item 38 ("Email me new responses") is Release 5. Release 4b is live.

## Global Constraints

- **Review link** (spec 35): the owner adds a Google review link, or another site's. After sending feedback, the thank-you screen offers "Share it on Google" to everyone. Spec ruling 1: everyone, not only happy customers, because Google bans review gating.
- **Rating styles** (spec 36):
  - stars (today), faces (5), thumbs up or down, or 0–10;
  - the code page's summary adapts: an average for stars and faces, percent up for thumbs, and an NPS-style score for 0–10.
- **Up to 3 questions** (spec 37), each with its own rating style. The comment and contact boxes stay at the end.
- **Migration** (spec 9):
  - `feedback_responses` gains `answers jsonb`, and `record_feedback` (in this codebase, `submit_feedback`) accepts several answers and rating styles;
  - the old one-rating form keeps working;
  - the migration follows the usual steps: a verified backup from the last 24 hours after checking the disk has room, no backslashes, applied through the private SQL bridge before merging, and recorded in the runbook.
- **Section 3 rules apply:**
  - old pages keep working;
  - the API docs list the new fields;
  - previews stay inert;
  - visible labels and 44 px targets, with no sideways scroll from 320 px;
  - axe clean;
  - limits visible;
  - tests for every new field;
  - browser tests and the sweeps.

## Rulings made in this plan (for David's review)

1. **Every question needs an answer before Send works.** They're quick taps, and complete answers make the summary meaningful. Comment and contact stay optional.
2. **The form sends only the answers' values.** The server takes each question's wording and style from the page, so nobody can store answers to questions that weren't asked.
3. **A response keeps the question exactly as it was asked.** Rewording a question later starts a new line in the summary rather than mixing old and new answers.
4. **Responses from before this release** (one star rating) count toward the first question when it's still a star question. Otherwise they show as "Earlier star ratings".
5. **NPS works the usual way:** 9–10 are promoters and 0–6 are detractors, and the score runs from −100 to 100. The summary shows the score and both shares.
6. **The button names the site from the link:** "Share it on Google", Yelp, Tripadvisor, Facebook or Trustpilot, and "Leave us a review" for any other site.
7. **The old one-rating database function stays as it is.** The live site keeps using it until the new code deploys; the new form posts through the new one. A visitor with the old form still open can still send their stars.
8. **Faces run from 1 to 5, like stars,** so their summary is an average too.
9. **0–10 is 11 numbered buttons,** in two rows on phones so each stays a 44 px target. The ends are labelled "Not likely" and "Very likely".
10. **The migration needs a verified backup from the last 24 hours.** If tonight's isn't there, I start the backup service myself before applying it; approving this plan approves that. I make no other server changes.

## Review Focus

1. **Old pages and responses:**
   - a page with only `question` reads as one star question;
   - an old form still open in a tab sends `rating`, and it's stored;
   - old rows show in the summary and the CSV;
   - the old `submit_feedback` keeps working after the migration.

   *Tasks 1, 2, 3 and 6 tests.*
2. **Answers sent by hand to the route:**
   - fewer or more values than questions;
   - a value out of range for its style (thumbs 2, scale 11, stars 0, 4.5);
   - text where numbers belong;
   - a page whose questions changed since the visitor loaded it.

   Each is refused with 400 or `false`, and nothing is stored. *Tasks 1 and 2 tests.*
3. **The summary:**
   - one response; all thumbs down;
   - NPS of all promoters (100), all detractors (−100) and all passives (0);
   - a reworded question;
   - responses with no answers;
   - CSV headers for three questions, plus commas and quotes in the text.

   *Task 6 test.*
4. **The form:**
   - keyboard-only answering of every style;
   - a screen reader hears each question's legend and each option's name;
   - the review button after sending opens the right site;
   - the preview stays inert.

   *Task 4 test.*
5. **Phones at 320 px:** three questions including a 0–10, with a long question text. There must be no sideways scroll, and every option must be 44 px. *Task 7 sweep.*

---

### Task 1: The migration: answers, and a function that checks them

**Files:**
- Create: `supabase/migrations/20261017200000_feedback_answers.sql`
- Modify:
  - `supabase/test/migration.test.ts`
  - `types/supabase.ts` (`feedback_responses` row; the new function)

**Interfaces:**
- Produces:
  - `feedback_responses.answers jsonb`, each element `{ question: string; style: "stars" | "faces" | "thumbs" | "scale"; value: number }`;
  - `feedback_responses.rating` is nullable, set from the first answer when that answer is stars or faces;
  - `submit_feedback_answers(p_slug text, p_answers jsonb, p_comment text, p_contact text, p_visitor_hash text) returns boolean`, callable by `service_role` only.

- [ ] **Step 1: Create the branch and commit this plan.**

```bash
git checkout -b feat/page-enhancements-r4c main
git add docs/superpowers/plans/2026-10-17-page-enhancements-release-4c-feedback.md
git commit -m "Plan: page enhancements release 4c, Feedback"
```

- [ ] **Step 2: Write the failing test.** In `supabase/test/migration.test.ts`, after "collect feedback through the server only…":

```ts
  it("store up to three answers per response, each checked for its rating style", async () => {
    await asEve(
      `insert into public.qr_codes (name, qr_type, is_dynamic, slug, content) values ('FB2', 'feedback', true, 'EVEFB2', '{}')`,
    );
    await expect(
      asAnon("select public.submit_feedback_answers('EVEFB2', '[]'::jsonb, null, null, 'v')"),
    ).rejects.toThrow(/permission denied/);
    const send = (answers: unknown, visitor = "answers-1", slug = "EVEFB2") =>
      asService<{ ok: boolean }>(
        "select public.submit_feedback_answers($1, $2::jsonb, 'Nice', null, $3) as ok",
        [slug, JSON.stringify(answers), visitor],
      );
    const q = (style: string, value: unknown, question = "How was it?") => ({ question, style, value });

    expect((await send([q("stars", 4), q("thumbs", 1), q("scale", 9)]))[0]?.ok).toBe(true);
    expect((await send([q("faces", 5)], "answers-2"))[0]?.ok).toBe(true);
    expect((await send([q("scale", 0)], "answers-3"))[0]?.ok).toBe(true);
    for (const bad of [
      [q("thumbs", 2)],
      [q("scale", 11)],
      [q("stars", 0)],
      [q("stars", 4.5)],
      [q("stars", "4")],
      [q("hearts", 3)],
      [q("stars", 3, "x".repeat(201))],
      [],
      [q("stars", 1), q("stars", 1), q("stars", 1), q("stars", 1)],
      { question: "Q", style: "stars", value: 3 },
    ]) {
      expect((await send(bad, "answers-4"))[0]?.ok, JSON.stringify(bad)).toBe(false);
    }
    expect((await send([q("stars", 5)], "answers-5", "EVEMENU"))[0]?.ok).toBe(false); // not feedback

    const rows = await asEve<{ rating: number | null; answers: unknown; comment: string }>(
      `select rating, answers, comment from public.feedback_responses
        where code_id = (select id from public.qr_codes where slug = 'EVEFB2') order by id`,
    );
    expect(rows).toEqual([
      { rating: 4, answers: [q("stars", 4), q("thumbs", 1), q("scale", 9)], comment: "Nice" },
      { rating: 5, answers: [q("faces", 5)], comment: "Nice" },
      { rating: null, answers: [q("scale", 0)], comment: "Nice" },
    ]);
    // The old one-rating function still works, and its rows have no answers.
    expect(
      (await asService<{ ok: boolean }>("select public.submit_feedback('EVEFB2', 3, null, null, 'old-1') as ok"))[0]?.ok,
    ).toBe(true);
    // The daily limit counts every response, either way.
    for (const visitor of ["limit", "limit", "limit"]) await send([q("stars", 3)], visitor);
    expect((await send([q("stars", 3)], "limit"))[0]?.ok).toBe(false);
  });
```

- [ ] **Step 3: Run it and watch it fail.**

Run: `npx vitest run supabase/test/migration.test.ts -t "three answers"`
Expected: FAIL. `submit_feedback_answers` doesn't exist.

- [ ] **Step 4: Write the migration** (no backslashes anywhere). Create `supabase/migrations/20261017200000_feedback_answers.sql`:

```sql
-- Feedback pages can ask up to three questions, each rated in its own style: stars or faces
-- (1 to 5), thumbs (1 up, 0 down), or 0 to 10 (page enhancements 4c, spec items 36-37). Each
-- response keeps its answers with the question as it was asked. The one-rating submit_feedback
-- stays as it is, so the live site keeps working until the new code is deployed.

alter table public.feedback_responses
  alter column rating drop not null,
  add column answers jsonb
    check (answers is null or (jsonb_typeof(answers) = 'array' and jsonb_array_length(answers) between 1 and 3));

-- Called by the app server with answers it built from the page's own questions. Returns whether
-- the response was stored: the page must be an active feedback page, every answer must fit its
-- style, and each visitor may send at most three responses per code per day.
create function public.submit_feedback_answers(
  p_slug text,
  p_answers jsonb,
  p_comment text,
  p_contact text,
  p_visitor_hash text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_recent int;
  v_answer jsonb;
  v_style text;
  v_value int;
begin
  select c.id into v_id
    from public.qr_codes c
   where c.is_dynamic and c.qr_type = 'feedback'
     and public.code_state(c.status, c.active_from, c.active_until) = 'active'
     and upper(c.slug) = upper(p_slug);
  if v_id is null or p_answers is null or jsonb_typeof(p_answers) <> 'array'
     or jsonb_array_length(p_answers) not between 1 and 3 then
    return false;
  end if;

  for v_answer in select value from jsonb_array_elements(p_answers) loop
    if jsonb_typeof(v_answer) <> 'object'
       or jsonb_typeof(v_answer -> 'question') is distinct from 'string'
       or char_length(v_answer ->> 'question') > 200
       or jsonb_typeof(v_answer -> 'value') is distinct from 'number'
       or (v_answer ->> 'value') !~ '^[0-9]{1,2}$' then
      return false;
    end if;
    v_style := v_answer ->> 'style';
    v_value := (v_answer ->> 'value')::int;
    if not (
      (v_style in ('stars', 'faces') and v_value between 1 and 5)
      or (v_style = 'thumbs' and v_value in (0, 1))
      or (v_style = 'scale' and v_value between 0 and 10)
    ) then
      return false;
    end if;
  end loop;

  select count(*) into v_recent
    from public.feedback_responses r
   where r.code_id = v_id
     and r.visitor_hash = p_visitor_hash
     and r.created_at > now() - interval '1 day';
  if v_recent >= 3 then
    return false;
  end if;

  insert into public.feedback_responses (code_id, rating, answers, comment, contact, visitor_hash)
  values (
    v_id,
    -- The first answer's stars or faces, for anything that reads the one rating.
    case when p_answers -> 0 ->> 'style' in ('stars', 'faces') then (p_answers -> 0 ->> 'value')::int end,
    p_answers,
    nullif(left(btrim(p_comment), 2000), ''),
    nullif(left(btrim(p_contact), 200), ''),
    left(coalesce(nullif(p_visitor_hash, ''), 'unknown'), 128)
  );
  return true;
end;
$$;

revoke all on function public.submit_feedback_answers(text, jsonb, text, text, text) from public, anon, authenticated;
grant execute on function public.submit_feedback_answers(text, jsonb, text, text, text) to service_role;
```

Check that the file has no backslashes: `grep -c '\\' supabase/migrations/20261017200000_feedback_answers.sql` prints `0`.

`types/supabase.ts`:
- The `feedback_responses` Row's `rating` becomes `number | null`, and the Row gains `answers: Json | null`.
- `Functions` gains:

```ts
      submit_feedback_answers: {
        Args: {
          p_slug: string;
          p_answers: Json;
          p_comment: string | null;
          p_contact: string | null;
          p_visitor_hash: string;
        };
        Returns: boolean;
      };
```

- [ ] **Step 5: Run the test and watch it pass.**

Run: `npx vitest run supabase/test/migration.test.ts && npx tsc --noEmit`
Expected: PASS. TypeScript flags `r.rating` as possibly null in `FeedbackResponses.tsx`. Handle it as `r.rating ?? 0` there for now; Task 6 rewrites the component.

- [ ] **Step 6: Apply it to the local database** so the browser tests run against it.

Run: `npx --yes supabase@2.120.0 migration up --local`
Expected: `Applying migration 20261017200000_feedback_answers.sql...`

- [ ] **Step 7: Commit.**

```bash
git add supabase types features/dashboard/FeedbackResponses.tsx
git commit -m "Feedback responses keep up to three answers, each checked for its rating style"
```

---

### Task 2: Feedback data: questions with styles, a review link, and answers built on the server

**Files:**
- Create:
  - `lib/pages/feedback.ts`
  - `lib/pages/feedback.test.ts`
- Modify:
  - `lib/pages/types.ts` (`FeedbackQuestion`, `FeedbackPage`, `LIMITS.questions`)
  - `lib/pages/sanitize.ts` (schema; upgrade)
  - `lib/pages/validate.ts` (feedback)
  - `app/p/[slug]/feedback/route.ts`
  - `features/pages/PageView.tsx` and `features/pages/editor/editors/FeedbackEditor.tsx` (still compile; Tasks 4 and 5 finish them)

**Interfaces:**
- Produces:
  - `RATING_STYLES`, `RatingStyle`, `STYLE_LABEL`;
  - `FeedbackQuestion = { text: string; style: RatingStyle }`;
  - `FeedbackAnswer = { question: string; style: RatingStyle; value: number }`;
  - `validValue(style, value)`, `buildAnswers(questions, values): FeedbackAnswer[] | null` and `reviewLabel(url): string | null`;
  - `FeedbackPage.questions: FeedbackQuestion[]` (max 3, replaces `question`) and `reviewUrl: string`.

- [ ] **Step 1: Write the failing tests.** Create `lib/pages/feedback.test.ts`:

```ts
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
    expect(sanitizePage("feedback", { questions: [{ text: "Q", style: "hearts" }] }).questions).toEqual([
      { text: "Q", style: "stars" },
    ]);
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
    expect(reviewLabel("https://search.google.com/local/writereview?placeid=x")).toBe("Share it on Google");
    expect(reviewLabel("https://www.yelp.com/writeareview/biz/x")).toBe("Share it on Yelp");
    expect(reviewLabel("https://www.tripadvisor.co.uk/UserReview-x")).toBe("Share it on Tripadvisor");
    expect(reviewLabel("https://www.trustpilot.com/evaluate/x")).toBe("Share it on Trustpilot");
    expect(reviewLabel("https://example.com/review")).toBe("Leave us a review");
    expect(reviewLabel("")).toBeNull();
  });

  it("needs a question, and checks the review link", () => {
    const page = { ...PAGE_DEFAULTS.feedback(), business: "Cafe" };
    expect(validatePage("feedback", { ...page, questions: [{ text: "", style: "stars" }] })).toEqual({
      "questions.0.text": "Add a question",
    });
    expect(validatePage("feedback", { ...page, reviewUrl: "not a link" })).toEqual({
      reviewUrl: "Enter a web address, like example.com",
    });
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run lib/pages/feedback.test.ts`
Expected: FAIL. `./feedback` doesn't exist.

- [ ] **Step 3: Implement.** Create `lib/pages/feedback.ts`:

```ts
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
export function buildAnswers(questions: FeedbackQuestion[], values: unknown): FeedbackAnswer[] | null {
  const asked = questions.filter((q) => q.text.trim());
  if (!asked.length || !Array.isArray(values) || values.length !== asked.length) return null;
  const answers = asked.map((q, i) => ({ question: q.text.trim().slice(0, 200), style: q.style, value: values[i] as number }));
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
```

`lib/pages/types.ts`:
- `FeedbackPage` becomes:

  ```ts
  { business; logo; /** Up to 3, each rated in its own style (spec item 37). */ questions: FeedbackQuestion[]; allowComment; askContact; thanks; /** A Google (or other) review link, offered to everyone after sending (spec 35). */ reviewUrl: string }
  ```

  Import `type FeedbackQuestion` from `./feedback`.
- `LIMITS.questions = 3`.
- The defaults are `questions: [{ text: "How was your visit?", style: "stars" }], reviewUrl: ""`.

`lib/pages/sanitize.ts`:
- The feedback schema replaces `question` with:

```ts
    questions: {
      kind: "list",
      max: LIMITS.questions,
      item: { text: str(200), style: { kind: "enum", values: RATING_STYLES } },
    },
    reviewUrl: str(2048),
```

- Add an `UPGRADES` entry:

```ts
  // Feedback pages asked one star question before they could ask several (spec item 37).
  feedback: (raw) =>
    !("questions" in raw) && typeof raw.question === "string"
      ? { ...raw, questions: [{ text: raw.question, style: "stars" }] }
      : raw,
```

`lib/pages/validate.ts` feedback:

```ts
  feedback: (p) => {
    const errors: PageErrors = {};
    if (!p.business.trim()) errors.business = "Add the business name";
    if (!p.questions.some((q) => q.text.trim())) {
      errors[p.questions.length ? "questions.0.text" : "questions"] = "Add a question";
    }
    checkUrl(errors, "reviewUrl", p.reviewUrl);
    return errors;
  },
```

`app/p/[slug]/feedback/route.ts`:
1. Remove the rating-only check.
2. After the honeypot and the page lookup, build the answers from the page:

```ts
  const content = sanitizePage("feedback", page.content);
  // The values only; each answer's question and style come from the page (ruling 2). A form
  // loaded before questions could change still sends one `rating`.
  const values = Array.isArray(body.answers) ? body.answers : body.rating !== undefined ? [body.rating] : null;
  const answers = buildAnswers(content.questions, values);
  if (!answers) return json({ error: "bad_request" }, 400);
```

3. Call `admin.rpc("submit_feedback_answers", { p_slug: slug, p_answers: answers, p_comment: …, p_contact: …, p_visitor_hash: … })`.
4. Make sure the page really is a feedback page: `if (page.type !== "feedback") return json({ error: "not_found" }, 404)`, using the field `getPublicPage` returns.

Make `FeedbackView` and `FeedbackEditor` compile:
- **`FeedbackView`:** passes `question={page.questions[0]?.text ?? ""}` for now.
- **`FeedbackEditor`:** binds the Question box to `questions[0].text`.
- **Old fixtures** with `question` keep working through the upgrade.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run lib/pages && npx tsc --noEmit`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add lib/pages "app/p/[slug]/feedback" features/pages
git commit -m "Feedback data: up to three questions with rating styles, a review link, and answers built from the page on the server"
```

---

### Task 3: The feedback route, tested

**Files:**
- Create: `app/p/[slug]/feedback/route.test.ts`

**Interfaces:**
- Consumes: Task 2's route.

- [ ] **Step 1: Write the test.** Mock the admin client and the page lookup the way other route tests do; see `app/p/[slug]/page.test.tsx` for the existing mocks.

```ts
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
      headers: { "content-type": "application/json", "user-agent": "Mozilla/5.0 (iPhone)" },
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
    expect(rpc).toHaveBeenCalledWith("submit_feedback_answers", expect.objectContaining({
      p_slug: "FB1",
      p_answers: [
        { question: "Food?", style: "stars", value: 4 },
        { question: "Back?", style: "thumbs", value: 1 },
      ],
      p_comment: "Lovely",
      p_contact: null,
    }));
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
});
```

If the route reads headers through `NextRequest` features (`request.cookies`, `nextUrl`), build the request with `new NextRequest(...)` from `next/server` instead. If `scanContext` treats the test's user agent as a bot (a 200 with no call), use a full mobile Safari user-agent string.

- [ ] **Step 2: Run it.** It should pass against Task 2's route. If it fails, fix the route, not the test.

Run: `npx vitest run "app/p/[slug]/feedback/route.test.ts"`
Expected: PASS. If it passes at once, check it by breaking the route temporarily (drop `buildAnswers`) and watching it fail, then restore.

- [ ] **Step 3: Commit.**

```bash
git add "app/p/[slug]/feedback/route.test.ts"
git commit -m "Tests for the feedback route: answers from the page's questions, refusals, and the daily limit"
```

---

### Task 4: The visitor's form: every rating style, and the review button

**Files:**
- Modify:
  - `features/pages/FeedbackForm.tsx`
  - `features/pages/PageView.tsx` (`FeedbackView` passes the questions and review link)
- Test: `features/pages/FeedbackForm.test.tsx` (create)

**Interfaces:**
- Consumes: Task 2's `FeedbackQuestion`, `reviewLabel` and `RatingStyle`.
- Produces: `FeedbackForm` props `{ slug, questions, allowComment, askContact, thanks, reviewUrl, preview? }`.

- [ ] **Step 1: Write the failing tests.** Create `features/pages/FeedbackForm.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FeedbackForm } from "./FeedbackForm";

const questions = [
  { text: "How was the food?", style: "faces" as const },
  { text: "Would you come back?", style: "thumbs" as const },
  { text: "How likely are you to recommend us?", style: "scale" as const },
];
const form = (patch = {}) => (
  <FeedbackForm
    slug="FB1"
    questions={questions}
    allowComment
    askContact={false}
    thanks="Thanks!"
    reviewUrl="https://g.page/r/abc/review"
    {...patch}
  />
);

describe("FeedbackForm", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("asks each question in its style, and sends once all are answered", async () => {
    const user = userEvent.setup();
    const fetch = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    render(form());
    const send = screen.getByRole("button", { name: "Send feedback" });
    const faces = within(screen.getByRole("group", { name: "How was the food?" }));
    await user.click(faces.getByRole("radio", { name: "4: Good" }));
    expect(send).toBeDisabled();
    await user.click(
      within(screen.getByRole("group", { name: "Would you come back?" })).getByRole("radio", {
        name: "Thumbs up",
      }),
    );
    await user.click(
      within(screen.getByRole("group", { name: "How likely are you to recommend us?" })).getByRole(
        "radio",
        { name: "9 out of 10" },
      ),
    );
    expect(send).toBeEnabled();
    await user.click(send);
    expect(JSON.parse(fetch.mock.calls[0]![1]!.body as string)).toMatchObject({ answers: [4, 1, 9] });
  });

  it("offers the review link to everyone after sending", async () => {
    const user = userEvent.setup();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
    render(form({ questions: [{ text: "Back?", style: "thumbs" }] }));
    await user.click(screen.getByRole("radio", { name: "Thumbs down" }));
    await user.click(screen.getByRole("button", { name: "Send feedback" }));
    expect(await screen.findByText("Thanks!")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Share it on Google/ })).toHaveAttribute(
      "href",
      "https://g.page/r/abc/review",
    );
  });

  it("keeps stars for a star question, and can be answered with the keyboard", async () => {
    const user = userEvent.setup();
    render(form({ questions: [{ text: "Rate us", style: "stars" }] }));
    await user.tab();
    await user.keyboard("{ArrowRight}{ArrowRight}");
    expect(screen.getByRole("radio", { name: /^3 stars/ })).toBeChecked();
  });

  it("sends nothing from the editor's preview", () => {
    render(form({ preview: true }));
    expect(screen.getByRole("button", { name: "Send feedback" })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run features/pages/FeedbackForm.test.tsx`
Expected: FAIL. The form takes one question and has no faces, thumbs, 0–10 or review link.

- [ ] **Step 3: Implement.** `features/pages/FeedbackForm.tsx`:
- The props become `{ slug, questions: FeedbackQuestion[], allowComment, askContact, thanks, reviewUrl, preview? }`.
- Hold `values: (number | null)[]`, one per asked question (those with text), each starting as `null`.
- Send is disabled until every value is set (ruling 1).
- The body is `{ answers: values, comment, contact, website }`.

Each question is its own `fieldset` with the question as its `legend`, rendered by style:

```tsx
const LABELS = ["Very bad", "Bad", "Okay", "Good", "Excellent"];
const FACES = [Angry, Frown, Meh, Smile, Laugh];
const option =
  "grid cursor-pointer place-items-center rounded-xl has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--page-accent)]";

function Rating({ question, value, onChange, name }: { question: FeedbackQuestion; value: number | null; onChange: (v: number) => void; name: string }) {
  const [hover, setHover] = useState(0);
  if (question.style === "thumbs") {
    return (
      <div className="flex justify-center gap-3">
        {[1, 0].map((v) => {
          const Icon = v ? ThumbsUp : ThumbsDown;
          const on = value === v;
          return (
            <label key={v} className={cn(option, "size-16 border-2", on ? "border-[var(--page-accent)] bg-[var(--page-accent)] text-[var(--page-accent-fg)]" : "border-border text-fg")}>
              <input type="radio" name={name} value={v} className="sr-only" checked={on} onChange={() => onChange(v)} aria-label={v ? "Thumbs up" : "Thumbs down"} />
              <Icon aria-hidden className="size-8" />
            </label>
          );
        })}
      </div>
    );
  }
  if (question.style === "scale") {
    return (
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-6 gap-1.5 min-[26rem]:grid-cols-11">
          {Array.from({ length: 11 }, (_, v) => (
            <label key={v} className={cn(option, "min-h-11 border text-sm font-semibold tabular-nums", value === v ? "border-[var(--page-accent)] bg-[var(--page-accent)] text-[var(--page-accent-fg)]" : "border-border text-fg")}>
              <input type="radio" name={name} value={v} className="sr-only" checked={value === v} onChange={() => onChange(v)} aria-label={`${v} out of 10`} />
              {v}
            </label>
          ))}
        </div>
        <div className="flex justify-between text-xs text-fg-muted">
          <span>Not likely</span>
          <span>Very likely</span>
        </div>
      </div>
    );
  }
  // Stars and faces: 1-5, with a word for each.
  const shown = hover || value || 0;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1" onPointerLeave={() => setHover(0)}>
        {LABELS.map((label, i) => {
          const Face = FACES[i]!;
          return (
            <label key={label} className={cn(option, "p-1")} onPointerEnter={() => setHover(i + 1)}>
              <input
                type="radio"
                name={name}
                value={i + 1}
                className="sr-only"
                checked={value === i + 1}
                onChange={() => onChange(i + 1)}
                aria-label={question.style === "faces" ? `${i + 1}: ${label}` : `${i + 1} star${i ? "s" : ""}: ${label}`}
              />
              {question.style === "faces" ? (
                <Face aria-hidden strokeWidth={1.5} className={cn("size-10", i + 1 === shown ? "text-[var(--page-accent)]" : "text-fg-muted")} />
              ) : (
                <Star aria-hidden strokeWidth={1.5} className={cn("size-10 transition-colors", i < shown ? "fill-[var(--page-accent)] text-[var(--page-accent)]" : "text-fg-muted")} />
              )}
            </label>
          );
        })}
      </div>
      <p className="h-5 text-sm text-fg-muted">
        {shown ? LABELS[shown - 1] : question.style === "faces" ? "Tap a face" : "Tap a star to rate"}
      </p>
    </div>
  );
}
```

Each fieldset is `<fieldset className="flex flex-col gap-3"><legend className="mb-3 text-center text-lg font-semibold text-balance text-fg [overflow-wrap:anywhere]">{q.text}</legend><Rating …/></fieldset>`. Its radio group name is `q-${i}`, so each question is its own group and arrow keys move within it.

The done state becomes:

```tsx
  if (state === "done") {
    const label = reviewLabel(reviewUrl);
    return (
      <div role="status" className="flex flex-col items-center gap-4 py-6 text-center">
        <p className="text-lg font-semibold text-fg">{thanks || "Thank you!"}</p>
        {/* Offered to everyone, whatever they answered (spec ruling 1). */}
        {label && (
          <PageLink href={safeHref(reviewUrl)}>
            <Star aria-hidden /> {label}
          </PageLink>
        )}
      </div>
    );
  }
```

Imports: `Angry`, `Frown`, `Meh`, `Smile`, `Laugh`, `ThumbsUp` and `ThumbsDown` from lucide; `reviewLabel`, `type FeedbackQuestion` and `safeHref`; `PageLink` from `./parts`.

`features/pages/PageView.tsx` `FeedbackView` passes `questions={page.questions ?? [{ text: (page as unknown as { question?: string }).question ?? "", style: "stars" }]}` and `reviewUrl={page.reviewUrl ?? ""}`. It's drawn as given, so an old page still has `question`.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run features/pages && npx tsc --noEmit && npx eslint features/pages`
Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add features/pages
git commit -m "The feedback form: up to three questions as stars, faces, thumbs or 0 to 10, and Share it on Google after sending"
```

---

### Task 5: The feedback editor: questions with styles, and the review link

**Files:**
- Modify: `features/pages/editor/editors/FeedbackEditor.tsx`
- Test: `features/pages/editor/PageEditor.test.tsx`

- [ ] **Step 1: Write the failing tests.**

```tsx
describe("Feedback editor extras", () => {
  function Feedback() {
    const [page, setPage] = useState(PAGE_DEFAULTS.feedback());
    return (
      <>
        <PageEditor type="feedback" page={page} errors={{}} onUpdate={(update) => setPage((p) => update(p))} />
        <output aria-label="Page">{JSON.stringify(page)}</output>
      </>
    );
  }
  const saved = () => JSON.parse(screen.getByRole("status", { name: "Page" }).textContent!);

  it("adds up to three questions, each in its own rating style, and a review link", async () => {
    const user = userEvent.setup();
    render(<Feedback />);
    await user.click(screen.getByRole("button", { name: "Add question" }));
    const texts = screen.getAllByRole("textbox", { name: /^Question/ });
    await user.type(texts[1]!, "How likely are you to recommend us?");
    await user.selectOptions(screen.getAllByRole("combobox", { name: /^Rating style/ })[1]!, "scale");
    await user.type(screen.getByRole("textbox", { name: /^Review link/ }), "g.page/r/abc/review");
    expect(saved()).toMatchObject({
      questions: [
        { text: "How was your visit?", style: "stars" },
        { text: "How likely are you to recommend us?", style: "scale" },
      ],
      reviewUrl: "g.page/r/abc/review",
    });
    expect(screen.getByText(/Shows as Share it on Google/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add question" }));
    expect(screen.queryByRole("button", { name: "Add question" })).toBeNull();
  });
});
```

Update `CARDS.feedback` to `["Header", "Questions", "After sending"]`, and in `LABELS.feedback` keep `"Question"`.

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run features/pages/editor/PageEditor.test.tsx -t "Feedback editor extras|feedback:"`
Expected: FAIL.

- [ ] **Step 3: Implement.** In `features/pages/editor/editors/FeedbackEditor.tsx`:
1. **The Question card becomes "Questions":**

```tsx
      <FormCard title="Questions" note="Up to 3. Comment and contact boxes come after them.">
        <SortableList
          label="Questions"
          showLabel={false}
          items={page.questions}
          onChange={(questions) => set({ questions })}
          max={LIMITS.questions}
          addLabel="Add question"
          addAt="end"
          newRowFocus="input[data-field$='.text']"
          path="questions"
          errors={errors}
          itemLabel={(item, i) => rowName("question", item.text, i)}
          newItem={() => ({ text: "", style: "stars" as const })}
          render={(item, update, i) => (
            <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
              <TextField
                label="Question"
                value={item.text}
                onChange={(text) => update({ text })}
                path={`questions.${i}.text`}
                errors={errors}
                placeholder="How was your visit?"
              />
              <Field label="Rating style">
                {(control) => (
                  <Select {...control} data-field={`questions.${i}.style`} value={item.style} onChange={(event) => update({ style: event.target.value as RatingStyle })}>
                    {RATING_STYLES.map((style) => (
                      <option key={style} value={style}>{STYLE_LABEL[style]}</option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          )}
        />
        <ToggleField label="Ask for a comment" … />
        <ToggleField label="Ask for contact details" … />
      </FormCard>
```

   The two toggles are unchanged.
2. **The After sending card** gains, after the thank-you message:

```tsx
        <TextField
          label="Review link"
          optional
          type="url"
          inputMode="url"
          value={page.reviewUrl}
          onChange={(reviewUrl) => set({ reviewUrl })}
          path="reviewUrl"
          errors={errors}
          placeholder="g.page/r/…/review"
          hint={
            reviewLabel(page.reviewUrl)
              ? `Shows as ${reviewLabel(page.reviewUrl)} after sending, to everyone.`
              : "Your Google review link, or another site's. Everyone sees it after sending."
          }
        />
```

Imports: `LIMITS`, `rowName`, `SortableList`, `Field`, `Select`, `RATING_STYLES`, `STYLE_LABEL`, `reviewLabel` and `type RatingStyle`.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run features/pages && npx tsc --noEmit && npm run lint`
Expected: PASS, including the every-box-has-a-limit test (`questions.N.text`, `reviewUrl`).

- [ ] **Step 5: Commit.**

```bash
git add features/pages/editor
git commit -m "The feedback editor: up to three questions with a rating style each, and a review link"
```

---

### Task 6: The code page's summary: per question, in its style

**Files:**
- Create:
  - `lib/feedback/summary.ts`
  - `lib/feedback/summary.test.ts`
- Modify:
  - `features/dashboard/FeedbackResponses.tsx`
  - `features/dashboard/CodeOverview.tsx` (passes `content`)

**Interfaces:**
- Consumes: Task 1's row shape (`rating | null`, `answers`) and Task 2's `FeedbackQuestion`.
- Produces:
  - `answersOf(row, questions): FeedbackAnswer[]`;
  - `summarize(rows, questions): QuestionSummary[]`, where `QuestionSummary = { question: string; style: RatingStyle; count: number; headline: string; detail?: string }`;
  - `feedbackCsv(rows, questions): string`.

- [ ] **Step 1: Write the failing tests.** Create `lib/feedback/summary.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { answersOf, feedbackCsv, summarize } from "./summary";

const questions = [
  { text: "Food?", style: "stars" as const },
  { text: "Back?", style: "thumbs" as const },
  { text: "Recommend?", style: "scale" as const },
];
const row = (values: [number, number, number] | null, rating: number | null = null, extra = {}) => ({
  id: Math.random(),
  created_at: "2030-01-01T12:00:00Z",
  rating,
  answers: values && questions.map((q, i) => ({ question: q.text, style: q.style, value: values[i] })),
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
      summarize(values.map((v) => ({ id: v, created_at: "", rating: null, answers: [{ question: "Recommend?", style: "scale", value: v }], comment: null, contact: null })), scale)[0]!.headline;
    expect(nps([10, 9])).toBe("NPS 100");
    expect(nps([0, 6])).toBe("NPS -100");
    expect(nps([7, 8])).toBe("NPS 0");
  });

  it("counts an older star rating toward the first question while it's still stars", () => {
    expect(answersOf(row(null, 4), questions)).toEqual([{ question: "Food?", style: "stars", value: 4 }]);
    expect(answersOf(row(null, 4), [{ text: "Back?", style: "thumbs" }])).toEqual([
      { question: "Earlier star ratings", style: "stars", value: 4 },
    ]);
  });

  it("keeps a reworded question's answers apart, after the page's own questions", () => {
    const reworded = { id: 1, created_at: "", rating: 5, answers: [{ question: "Food quality?", style: "stars", value: 5 }], comment: null, contact: null };
    const summary = summarize([row([4, 1, 9]), reworded], questions);
    expect(summary.map((s) => s.question)).toEqual(["Food?", "Back?", "Recommend?", "Food quality?"]);
  });

  it("writes a CSV with a column per question, quoting what needs it", () => {
    const csv = feedbackCsv([row([5, 1, 10], null, { comment: 'Great, "really"' })], questions);
    expect(csv.split("\r\n")[0]).toBe("received_at,Food?,Back?,Recommend?,comment,contact");
    expect(csv.split("\r\n")[1]).toBe('2030-01-01T12:00:00Z,5,up,10,"Great, ""really""",');
  });
});
```

Check `csvField` in `lib/analytics/shape.ts` (quotes fields with commas or quotes) and match its output exactly.

- [ ] **Step 2: Run them and watch them fail.**

Run: `npx vitest run lib/feedback/summary.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement.** Create `lib/feedback/summary.ts`:

```ts
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
  typeof a === "object" && a !== null && typeof (a as FeedbackAnswer).question === "string" &&
  RATING_STYLES.includes((a as FeedbackAnswer).style) && typeof (a as FeedbackAnswer).value === "number";

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

function headline(style: RatingStyle, values: number[]): Pick<QuestionSummary, "headline" | "detail"> {
  const n = values.length;
  if (style === "thumbs") return { headline: `${pct(values.filter((v) => v === 1).length, n)}% thumbs up` };
  if (style === "scale") {
    const promoters = values.filter((v) => v >= 9).length;
    const detractors = values.filter((v) => v <= 6).length;
    return {
      headline: `NPS ${pct(promoters, n) - pct(detractors, n)}`,
      detail: `${pct(promoters, n)}% gave 9 or 10, ${pct(detractors, n)}% gave 0 to 6`,
    };
  }
  return { headline: `${(values.reduce((s, v) => s + v, 0) / n).toFixed(1)} out of 5` };
}

/** One line per question: the page's own questions first, in order, then any asked before. */
export function summarize(rows: ResponseRow[], questions: FeedbackQuestion[]): QuestionSummary[] {
  const groups = new Map<string, { question: string; style: RatingStyle; values: number[] }>();
  for (const q of questions.filter((q) => q.text.trim())) {
    groups.set(key({ question: q.text.trim(), style: q.style }), { question: q.text.trim(), style: q.style, values: [] });
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
    .map((g) => ({ question: g.question, style: g.style, count: g.values.length, ...headline(g.style, g.values) }));
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
    ].map((v) => csvField(v)).join(",");
  });
  return [header.map((h) => csvField(h)).join(","), ...lines].join("\r\n");
}
```

`features/dashboard/FeedbackResponses.tsx`:
- Takes `content: unknown` as well as `codeId`, and reads `const questions = sanitizePage("feedback", content).questions`.
- The header's description is `${n} responses`, or the empty text.
- Under the header, when there are responses, a summary list:

```tsx
            <dl className="grid gap-3 sm:grid-cols-3">
              {summary.map((s) => (
                <div key={`${s.style}|${s.question}`} className="rounded-control bg-surface-2 px-3.5 py-3">
                  <dt className="text-sm text-fg-muted [overflow-wrap:anywhere]">{s.question}</dt>
                  <dd className="mt-1 text-lg font-semibold text-fg">{s.headline}</dd>
                  {s.detail && <dd className="text-xs text-fg-muted">{s.detail}</dd>}
                  <dd className="text-xs text-fg-muted">{s.count} {s.count === 1 ? "answer" : "answers"}</dd>
                </div>
              ))}
            </dl>
```

- Each response row lists its answers, `answersOf(r, questions).map(a => <AnswerValue … />)`, where `AnswerValue` renders:
  - stars with the existing `Stars` component;
  - faces as the face icon plus its word;
  - thumbs as the thumb icon plus "Thumbs up" or "Thumbs down";
  - 0–10 as "9 out of 10".

  Each is preceded by its question in muted small text.
- The CSV link uses `feedbackCsv(rows, questions)`.

`features/dashboard/CodeOverview.tsx`: `<FeedbackResponses codeId={code.id} content={code.content} />`.

- [ ] **Step 4: Run the tests and watch them pass.**

Run: `npx vitest run lib/feedback features/dashboard && npx tsc --noEmit && npm run lint`
Expected: PASS. If `FeedbackResponses` has no test, add one rendering it with a mocked browser Supabase client that returns two rows. It should check the summary's "4.0 out of 5", a row's "Thumbs up", and the CSV link's `download="feedback.csv"`, following any existing mock of `getBrowserSupabase` in `features/dashboard/*.test.tsx`.

- [ ] **Step 5: Commit.**

```bash
git add lib/feedback features/dashboard
git commit -m "The code page's feedback summary: an average, percent thumbs up or NPS per question; answers listed and in the CSV"
```

---

### Task 7: Browser tests

**Files:**
- Modify:
  - `e2e/accounts/fixtures.ts`
  - `e2e/accounts/global-setup.ts` (a feedback code MAKER owns)
- Create: `e2e/accounts/feedback.spec.ts`

- [ ] **Step 1: Add the fixtures.**
- **In `PHONE_PAGES`**, so the sweeps cover it:

```ts
  {
    type: "feedback",
    slug: "PHONE-FEEDBACK-PLUS",
    content: {
      business: "Phone Bistro",
      questions: [
        { text: "How was the food, the service and the atmosphere this evening?", style: "faces" },
        { text: "Would you come back?", style: "thumbs" },
        { text: "How likely are you to recommend us to a friend?", style: "scale" },
      ],
      allowComment: true,
      askContact: true,
      thanks: "Thank you!",
      reviewUrl: "https://g.page/r/abc/review",
    },
  },
```

- **In `global-setup.ts`,** insert a feedback code owned by MAKER (slug `MAKER-FEEDBACK`, the same content with `stars`, `thumbs` and `scale`). Put its id in the seed as `makerFeedbackId`, and add `makerFeedbackId: string` to the `Seed` type in `fixtures.ts`.

- [ ] **Step 2: Write the tests.** Create `e2e/accounts/feedback.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

import { MAKER, seed } from "./fixtures";

test.describe("Feedback with several questions", () => {
  test("a visitor answers each question, then is offered the review link", async ({ page }) => {
    await page.goto("p/PHONE-FEEDBACK-PLUS");
    const send = page.getByRole("button", { name: "Send feedback" });
    await page.getByRole("group", { name: /How was the food/ }).getByRole("radio", { name: "5: Excellent" }).check({ force: true });
    await expect(send).toBeDisabled();
    await page.getByRole("group", { name: "Would you come back?" }).getByRole("radio", { name: "Thumbs up" }).check({ force: true });
    await page.getByRole("group", { name: /recommend us/ }).getByRole("radio", { name: "10 out of 10" }).check({ force: true });
    await send.click();
    await expect(page.getByText("Thank you!")).toBeVisible();
    await expect(page.getByRole("link", { name: /Share it on Google/ })).toHaveAttribute("href", "https://g.page/r/abc/review");
  });

  test.describe("the owner", () => {
    test.use({ storageState: MAKER.state });

    test("sees each question summarised in its style", async ({ page, browser }) => {
      // A visitor (signed out) answers first.
      const visitor = await browser.newContext({ baseURL: test.info().project.use.baseURL, storageState: { cookies: [], origins: [] } });
      const v = await visitor.newPage();
      await v.goto("p/MAKER-FEEDBACK");
      await v.getByRole("radio", { name: /^4 stars/ }).check({ force: true });
      await v.getByRole("radio", { name: "Thumbs down" }).check({ force: true });
      await v.getByRole("radio", { name: "9 out of 10" }).check({ force: true });
      await v.getByRole("button", { name: "Send feedback" }).click();
      await expect(v.getByRole("status")).toBeVisible();
      await visitor.close();

      await page.goto(`codes/${seed().makerFeedbackId}`);
      await expect(page.getByText("4.0 out of 5")).toBeVisible();
      await expect(page.getByText("0% thumbs up")).toBeVisible();
      await expect(page.getByText("NPS 100")).toBeVisible();
      await expect(page.getByRole("link", { name: /CSV/ })).toHaveAttribute("download", "feedback.csv");
    });
  });
});
```

The radios are visually hidden (`sr-only`), so `check({ force: true })` clicks them through their labels. If `getByRole("group")` doesn't name a fieldset by its legend in Playwright, use `page.locator("fieldset", { hasText: … })`.

- [ ] **Step 3: Run the signed-in suite.**

Run: `npm run test:e2e:accounts`
Expected: all PASS, including the phone and look sweeps for the new page. The local database has Task 1's migration from Step 6 there.

- [ ] **Step 4: Commit.**

```bash
git add e2e/accounts
git commit -m "Browser tests: answering three feedback questions, the review link, and the owner's summary"
```

---

### Task 8: Ship Release 4c, with the migration

- [ ] **Step 1: Update the API docs.** After the PDF and Audio paragraph:

> Feedback pages take `questions` (up to 3, each a `text` and a `style`: `stars`, `faces`, `thumbs` or `scale` for 0 to 10) and a `reviewUrl`, offered to everyone after sending. A single `question` still works, as one star question.

Commit it.

- [ ] **Step 2: Run the full local check.**

Run: `npm run format:check && npm run lint && npx tsc --noEmit && npm test && npm run test:e2e:accounts && npm run build && npm run test:e2e`
Expected: all PASS.

- [ ] **Step 3: Run the final whole-branch review,** with this plan's Review Focus and the ledger's rulings. Do one fix pass.

- [ ] **Step 4: Apply the migration to the live database before merging** (ruling 10). This uses the scratchpad's `srv.sh` (SSH) and `bridge_read.py` (the private SQL bridge, project `db12f7ce-3e77-4461-a686-c8cd6de6f764`). Nothing else on the server changes.
1. **Disk:** `srv.sh 'df -h /'`. There must be room for a backup; the runbook's reserve is 3 GiB plus headroom.
2. **Backup:** read `/var/lib/techitdave-offserver/health.json`. The latest verified archive must be from the last 24 hours. If it isn't:
   - run `srv.sh 'systemctl start techitdave-supabase-backup.service'`;
   - wait for it, then re-read `health.json` until a new archive is verified.
3. **Apply:** send the migration file's SQL through `bridge_read.py`, as one statement batch, then send `notify pgrst, 'reload schema'`.
4. **Verify** through the bridge:
   - `select is_nullable from information_schema.columns where table_name='feedback_responses' and column_name='rating'` returns `YES`;
   - the `answers` column exists;
   - `has_function_privilege('anon', 'public.submit_feedback_answers(text, jsonb, text, text, text)', 'execute')` is false;
   - the same check for `service_role` is true;
   - `select count(*) from public.feedback_responses` is unchanged from before.
5. **Record it in the runbook** `~/.codex/memories/supabase-coolify.md`, following the earlier entries: disk, backup, time applied, what changed, the checks, and the rollback. The rollback is `drop function public.submit_feedback_answers(text, jsonb, text, text, text); alter table public.feedback_responses drop column answers;`, with `rating` left nullable unless every row has one.

- [ ] **Step 5: Push, open the PR, wait for CI, and merge.**

```bash
git push -u origin feat/page-enhancements-r4c
gh pr create --base main --head feat/page-enhancements-r4c --title "Page enhancements 4c: feedback with up to three questions, four rating styles, a review link, and per-question summaries" --body "<items 35–37, the migration (applied live before merge), rulings, and test counts>

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
gh pr checks --watch
gh pr merge --merge
```

- [ ] **Step 6: Check the live site.**
1. Wait for the version in `https://ziplume.com/sw.js` to change.
2. Find client chunks containing "Add question" and "thumbs up".
3. Smoke-check: `/`, `/login`, `/signup` and `/developers` return 200; `/codes` returns 307.
4. Send no feedback to David's pages, and create nothing in his account.
