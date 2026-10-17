"use client";

import {
  Angry,
  Download,
  Frown,
  Laugh,
  Meh,
  Smile,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { IconButton, buttonClasses } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { answersOf, feedbackCsv, summarize, type ResponseRow } from "@/lib/feedback/summary";
import type { FeedbackAnswer } from "@/lib/pages/feedback";
import { sanitizePage } from "@/lib/pages/sanitize";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { FeedbackRow } from "@/types/supabase";

import { relativeTime } from "./format";

const WORDS = ["Very bad", "Bad", "Okay", "Good", "Excellent"];
const FACES = [Angry, Frown, Meh, Smile, Laugh];

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex" aria-label={`${rating} out of 5 stars`} role="img">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          aria-hidden
          className={cn("size-4", n <= rating ? "fill-amber-400 text-amber-400" : "text-border")}
        />
      ))}
    </span>
  );
}

/** One answer, drawn in its rating style. */
function AnswerValue({ answer }: { answer: FeedbackAnswer }) {
  if (answer.style === "stars") return <Stars rating={answer.value} />;
  if (answer.style === "faces") {
    const Face = FACES[answer.value - 1] ?? Meh;
    return (
      <span className="flex items-center gap-1.5 text-sm text-fg">
        <Face aria-hidden className="size-4" /> {WORDS[answer.value - 1]}
      </span>
    );
  }
  if (answer.style === "thumbs") {
    const Thumb = answer.value ? ThumbsUp : ThumbsDown;
    return (
      <span className="flex items-center gap-1.5 text-sm text-fg">
        <Thumb aria-hidden className="size-4" /> {answer.value ? "Thumbs up" : "Thumbs down"}
      </span>
    );
  }
  return <span className="text-sm font-medium text-fg tabular-nums">{answer.value} out of 10</span>;
}

/** Answers left on a feedback page, newest first, with a summary per question (spec item 36). */
export function FeedbackResponses({ codeId, content }: { codeId: string; content: unknown }) {
  const toast = useToast();
  const [rows, setRows] = useState<FeedbackRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const questions = useMemo(() => sanitizePage("feedback", content).questions, [content]);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let active = true;
    supabase
      .from("feedback_responses")
      .select("*")
      .eq("code_id", codeId)
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setFailed(true);
        else setRows(data);
      });
    return () => {
      active = false;
    };
  }, [codeId]);

  async function remove(id: number) {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const { error } = await supabase.from("feedback_responses").delete().eq("id", id);
    if (error) return toast("That response couldn't be deleted.", "error");
    setRows((list) => list?.filter((r) => r.id !== id) ?? null);
  }

  const responses = (rows ?? []) as ResponseRow[];
  const summary = summarize(responses, questions);
  const csv = responses.length
    ? `data:text/csv;charset=utf-8,${encodeURIComponent(feedbackCsv(responses, questions))}`
    : null;

  return (
    <Card>
      <CardHeader
        title="Responses"
        description={
          rows?.length
            ? `${rows.length} ${rows.length === 1 ? "response" : "responses"}`
            : "Answers and comments from your feedback page."
        }
        action={
          csv ? (
            <a href={csv} download="feedback.csv" className={buttonClasses("outline", "sm")}>
              <Download aria-hidden /> CSV
            </a>
          ) : undefined
        }
      />
      <div className="flex flex-col gap-4 px-5 pt-4 pb-6 sm:px-6">
        {failed ? (
          <p className="text-sm text-danger">Responses couldn’t be loaded.</p>
        ) : rows === null ? (
          <p className="text-sm text-fg-muted">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="rounded-control bg-surface-2 px-3.5 py-3 text-sm text-fg-muted">
            No responses yet. They appear here as soon as someone answers.
          </p>
        ) : (
          <>
            {/* A line per question, in its style: an average, thumbs up, or NPS. */}
            <dl className="grid gap-3 sm:grid-cols-3">
              {summary.map((s) => (
                <div
                  key={`${s.style}|${s.question}`}
                  className="rounded-control bg-surface-2 px-3.5 py-3"
                >
                  <dt className="text-sm [overflow-wrap:anywhere] text-fg-muted">{s.question}</dt>
                  <dd className="mt-1 text-lg font-semibold text-fg">{s.headline}</dd>
                  {s.detail && <dd className="text-xs text-fg-muted">{s.detail}</dd>}
                  <dd className="text-xs text-fg-muted">
                    {s.count} {s.count === 1 ? "answer" : "answers"}
                  </dd>
                </div>
              ))}
            </dl>
            <ul className="divide-y divide-border">
              {responses.map((r) => (
                <li key={r.id} className="flex gap-3 py-3">
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <span className="text-xs text-fg-muted">{relativeTime(r.created_at)}</span>
                    {answersOf(r, questions).map((a, i) => (
                      <div key={i} className="flex flex-col gap-0.5">
                        <span className="text-xs [overflow-wrap:anywhere] text-fg-muted">
                          {a.question}
                        </span>
                        <AnswerValue answer={a} />
                      </div>
                    ))}
                    {r.comment && (
                      <p className="text-sm whitespace-pre-line text-fg">{r.comment}</p>
                    )}
                    {r.contact && <p className="text-sm text-fg-muted">Contact: {r.contact}</p>}
                  </div>
                  <IconButton
                    label="Delete response"
                    size="icon-sm"
                    onClick={() => void remove(r.id)}
                  >
                    <Trash2 aria-hidden />
                  </IconButton>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Card>
  );
}
