"use client";

import { Star } from "lucide-react";
import { useState, type FormEvent } from "react";

import { cn } from "@/lib/cn";

import { pageButton } from "./parts";

const LABELS = ["Very bad", "Bad", "Okay", "Good", "Excellent"];

interface FeedbackFormProps {
  slug: string;
  question: string;
  allowComment: boolean;
  askContact: boolean;
  thanks: string;
  preview?: boolean;
}

export function FeedbackForm({
  slug,
  question,
  allowComment,
  askContact,
  thanks,
  preview,
}: FeedbackFormProps) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error" | "limited">("idle");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (preview || !rating) return;
    const data = new FormData(event.currentTarget);
    setState("sending");
    try {
      const response = await fetch(`/p/${encodeURIComponent(slug)}/feedback`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rating,
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
    return (
      <p role="status" className="py-6 text-center text-lg font-semibold text-fg">
        {thanks || "Thank you!"}
      </p>
    );
  }

  const shown = hover || rating;
  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <fieldset className="flex flex-col items-center gap-3">
        <legend className="mb-3 text-center text-lg font-semibold text-balance text-fg">
          {question}
        </legend>
        <div className="flex gap-1" onPointerLeave={() => setHover(0)}>
          {LABELS.map((label, i) => (
            <label
              key={label}
              className="cursor-pointer rounded-xl p-1 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--page-accent)]"
              onPointerEnter={() => setHover(i + 1)}
            >
              <input
                type="radio"
                name="rating"
                value={i + 1}
                className="sr-only"
                checked={rating === i + 1}
                onChange={() => setRating(i + 1)}
                aria-label={`${i + 1} star${i ? "s" : ""}: ${label}`}
              />
              <Star
                aria-hidden
                className={cn(
                  "size-10 transition-colors",
                  // The page's accent (3:1 on cards); empty stars in the muted text color.
                  i < shown
                    ? "fill-[var(--page-accent)] text-[var(--page-accent)]"
                    : "text-fg-muted",
                )}
                strokeWidth={1.5}
              />
            </label>
          ))}
        </div>
        <p className="h-5 text-sm text-fg-muted">
          {shown ? LABELS[shown - 1] : "Tap a star to rate"}
        </p>
      </fieldset>
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
        disabled={!rating || state === "sending" || preview}
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
