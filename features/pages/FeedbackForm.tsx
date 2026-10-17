"use client";

import { Angry, Frown, Laugh, Meh, Smile, Star, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState, type FormEvent } from "react";

import { cn } from "@/lib/cn";
import { reviewLabel, type FeedbackQuestion } from "@/lib/pages/feedback";
import { safeHref } from "@/lib/pages/urls";

import { pageButton, PageLink } from "./parts";

const LABELS = ["Very bad", "Bad", "Okay", "Good", "Excellent"];
const FACES = [Angry, Frown, Meh, Smile, Laugh];
const option =
  "grid cursor-pointer place-items-center rounded-xl has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--page-accent)]";

function Rating({
  question,
  value,
  onChange,
  name,
}: {
  question: FeedbackQuestion;
  value: number | null;
  onChange: (v: number) => void;
  name: string;
}) {
  const [hover, setHover] = useState(0);
  if (question.style === "thumbs") {
    return (
      <div className="flex justify-center gap-3">
        {[1, 0].map((v) => {
          const Icon = v ? ThumbsUp : ThumbsDown;
          const on = value === v;
          return (
            <label
              key={v}
              className={cn(
                option,
                "size-16 border-2",
                on
                  ? "border-[var(--page-accent)] bg-[var(--page-accent)] text-[var(--page-accent-fg)]"
                  : "border-border text-fg",
              )}
            >
              <input
                type="radio"
                name={name}
                value={v}
                className="sr-only"
                checked={on}
                onChange={() => onChange(v)}
                aria-label={v ? "Thumbs up" : "Thumbs down"}
              />
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
        {/* By the page's own width, so every button stays a 44px target (ruling 9): 4 a row on a
            small phone, 6 from 23rem. Eleven in one row never fit at 44px. */}
        <div className="grid grid-cols-4 gap-1.5 @min-[23rem]:grid-cols-6">
          {Array.from({ length: 11 }, (_, v) => (
            <label
              key={v}
              className={cn(
                option,
                "min-h-11 border text-sm font-semibold tabular-nums",
                value === v
                  ? "border-[var(--page-accent)] bg-[var(--page-accent)] text-[var(--page-accent-fg)]"
                  : "border-border text-fg",
              )}
            >
              <input
                type="radio"
                name={name}
                value={v}
                className="sr-only"
                checked={value === v}
                onChange={() => onChange(v)}
                aria-label={`${v} out of 10`}
              />
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
                aria-label={
                  question.style === "faces"
                    ? `${i + 1}: ${label}`
                    : `${i + 1} star${i ? "s" : ""}: ${label}`
                }
              />
              {question.style === "faces" ? (
                <Face
                  aria-hidden
                  strokeWidth={1.5}
                  className={cn(
                    "size-10",
                    i + 1 === shown ? "text-[var(--page-accent)]" : "text-fg-muted",
                  )}
                />
              ) : (
                <Star
                  aria-hidden
                  strokeWidth={1.5}
                  className={cn(
                    "size-10 transition-colors",
                    i < shown
                      ? "fill-[var(--page-accent)] text-[var(--page-accent)]"
                      : "text-fg-muted",
                  )}
                />
              )}
            </label>
          );
        })}
      </div>
      <p className="h-5 text-sm text-fg-muted">
        {shown
          ? LABELS[shown - 1]
          : question.style === "faces"
            ? "Tap a face"
            : "Tap a star to rate"}
      </p>
    </div>
  );
}

interface FeedbackFormProps {
  slug: string;
  questions: FeedbackQuestion[];
  allowComment: boolean;
  askContact: boolean;
  thanks: string;
  reviewUrl: string;
  preview?: boolean;
}

/** Up to three questions, each in its own rating style, then the comment and contact (spec 36-37). */
export function FeedbackForm({
  slug,
  questions,
  allowComment,
  askContact,
  thanks,
  reviewUrl,
  preview,
}: FeedbackFormProps) {
  const asked = questions.filter((q) => q.text.trim());
  const [values, setValues] = useState<(number | null)[]>(() => asked.map(() => null));
  const [state, setState] = useState<"idle" | "sending" | "done" | "error" | "limited">("idle");
  // Every question needs an answer (ruling 1); the editor's preview never sends.
  const ready =
    asked.length > 0 && asked.every((_, i) => values[i] !== null && values[i] !== undefined);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview || !ready) return;
    const data = new FormData(event.currentTarget);
    setState("sending");
    try {
      const response = await fetch(`/p/${encodeURIComponent(slug)}/feedback`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          answers: values,
          comment: data.get("comment") ?? "",
          contact: data.get("contact") ?? "",
          website: data.get("website") ?? "",
        }),
      });
      setState(response.ok ? "done" : response.status === 429 ? "limited" : "error");
    } catch {
      setState("error");
    }
  }

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

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {asked.map((q, i) => (
        <fieldset key={i} className="flex flex-col gap-3">
          <legend className="mb-3 w-full text-center text-lg font-semibold text-balance [overflow-wrap:anywhere] text-fg">
            {q.text}
          </legend>
          <Rating
            question={q}
            name={`q-${i}`}
            value={values[i] ?? null}
            onChange={(v) => setValues((list) => list.map((old, j) => (j === i ? v : old)))}
          />
        </fieldset>
      ))}
      {allowComment && (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
          Tell us more <span className="sr-only">(optional)</span>
          <textarea
            name="comment"
            rows={4}
            maxLength={2000}
            className="rounded-xl border border-field-border bg-surface px-3.5 py-3 text-base font-normal text-fg focus-visible:outline-2 focus-visible:outline-[var(--page-accent)]"
          />
        </label>
      )}
      {askContact && (
        <label className="flex flex-col gap-1.5 text-sm font-medium text-fg">
          Email or phone, if you’d like a reply
          <input
            name="contact"
            maxLength={200}
            autoComplete="email"
            className="h-12 rounded-xl border border-field-border bg-surface px-3.5 text-base font-normal text-fg focus-visible:outline-2 focus-visible:outline-[var(--page-accent)]"
          />
        </label>
      )}
      {/* Bots tend to fill every field; people never see this one. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <button
        type="submit"
        disabled={!ready || state === "sending" || preview}
        className={cn(pageButton.primary, "disabled:opacity-50")}
      >
        {state === "sending" ? "Sending…" : "Send feedback"}
      </button>
      {state === "error" && (
        <p role="alert" className="text-center text-sm text-danger">
          Your feedback couldn’t be sent. Please try again.
        </p>
      )}
      {state === "limited" && (
        <p role="alert" className="text-center text-sm text-fg-muted">
          Thanks, we’ve already received your feedback today.
        </p>
      )}
    </form>
  );
}
