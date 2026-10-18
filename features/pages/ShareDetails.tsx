"use client";

import { Send } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { shareErrors, VISITOR_LIMITS, type ShareInput } from "@/lib/pages/responses";

import { PageCard, pageButton } from "./parts";
import { VisitorField } from "./VisitorField";

const EMPTY: ShareInput = { name: "", phone: "", email: "", note: "" };
const ORDER = ["name", "phone", "email", "note"] as const;

/** "Share your details": a short form that sends a visitor's own details back (spec item 15). */
export function ShareDetails({
  slug,
  owner,
  preview,
}: {
  slug: string;
  /** Who gets them, for the thank-you: "Thanks! Ana has your details." */
  owner: string;
  preview?: boolean;
}) {
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState(EMPTY);
  const [tried, setTried] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error" | "limited">("idle");
  // Once they've tried to send, the errors follow what's typed.
  const errors = tried ? shareErrors(input) : {};
  const set = (patch: Partial<ShareInput>) => setInput((old) => ({ ...old, ...patch }));

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const found = shareErrors(input);
    setTried(true);
    const first = ORDER.find((key) => found[key]);
    if (first) {
      (form.elements.namedItem(first) as HTMLElement | null)?.focus();
      return;
    }
    const website = new FormData(form).get("website") ?? "";
    setState("sending");
    try {
      const response = await fetch(`/p/${encodeURIComponent(slug)}/share`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...input, website }),
      });
      setState(response.ok ? "done" : response.status === 429 ? "limited" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p
        role="status"
        className="rounded-(--pg-radius) border border-border bg-surface px-5 py-4 text-center font-semibold text-fg"
      >
        Thanks! {owner} has your details.
      </p>
    );
  }

  return (
    <>
      {preview ? (
        <span className={pageButton.secondary} aria-disabled>
          <Send aria-hidden /> Share your details
        </span>
      ) : (
        <button
          type="button"
          className={pageButton.secondary}
          aria-expanded={open}
          aria-controls={open ? formId : undefined}
          onClick={() => setOpen((was) => !was)}
        >
          <Send aria-hidden /> Share your details
        </button>
      )}
      {open && (
        <PageCard>
          <form id={formId} noValidate onSubmit={submit} className="flex flex-col gap-4">
            <p className="text-sm text-fg-muted">
              Send {owner} your name, with a phone number or an email.
            </p>
            <VisitorField
              label="Name"
              name="name"
              autoComplete="name"
              limit={VISITOR_LIMITS.name}
              value={input.name}
              onChange={(name) => set({ name })}
              error={errors.name}
            />
            <VisitorField
              label="Phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              limit={VISITOR_LIMITS.phone}
              value={input.phone}
              onChange={(phone) => set({ phone })}
              error={errors.phone}
            />
            <VisitorField
              label="Email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              limit={VISITOR_LIMITS.email}
              value={input.email}
              onChange={(email) => set({ email })}
              error={errors.email}
            />
            <VisitorField
              label="Note"
              name="note"
              optional
              multiline
              limit={VISITOR_LIMITS.note}
              value={input.note}
              onChange={(note) => set({ note })}
              error={errors.note}
            />
            {/* Bots tend to fill every field; people never see this one. */}
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
            <button type="submit" className={pageButton.primary} disabled={state === "sending"}>
              {state === "sending" ? "Sending…" : "Send"}
            </button>
            {state === "error" && (
              <p role="alert" className="text-center text-sm text-danger">
                Your details couldn’t be sent. Please try again.
              </p>
            )}
            {state === "limited" && (
              <p role="alert" className="text-center text-sm text-fg-muted">
                Thanks, your details have already been sent today.
              </p>
            )}
          </form>
        </PageCard>
      )}
    </>
  );
}
