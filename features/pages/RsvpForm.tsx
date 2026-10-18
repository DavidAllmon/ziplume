"use client";

import { CalendarCheck } from "lucide-react";
import { useEffect, useId, useState, type FormEvent, type ReactNode } from "react";

import { eventTimes } from "@/lib/pages/files";
import {
  guestChoices,
  rsvpCapacity,
  rsvpErrors,
  VISITOR_LIMITS,
  type RsvpInput,
} from "@/lib/pages/responses";
import type { EventPage } from "@/lib/pages/types";

import { pageButton } from "./parts";
import { useMinute } from "./useMinute";
import { useRemembered } from "./useRemembered";
import { VisitorField } from "./VisitorField";

const ORDER = ["name", "email", "guests", "note"] as const;
const heading = "mb-3 font-page-heading text-lg font-bold text-fg";

function Listed({ already }: { already?: boolean }) {
  return (
    <p role="status" className="flex items-center gap-2 font-semibold text-fg">
      <CalendarCheck aria-hidden className="size-5 text-(--page-accent)" />
      {already ? "You’re already on the list" : "You’re on the list"}
    </p>
  );
}

/** The RSVP form (spec item 33): who's coming and how many, while places are left. */
export function RsvpForm({
  slug,
  event,
  preview,
}: {
  slug: string;
  event: EventPage;
  preview?: boolean;
}) {
  const guestsId = useId();
  const now = useMinute();
  const capacity = rsvpCapacity(event.rsvpCapacity);
  // Places left: from the server once it answers; until then (and in the preview) the limit.
  const [fetched, setFetched] = useState<number | null | undefined>(undefined);
  const left = capacity === null ? null : (fetched ?? capacity);
  const [raw, remember] = useRemembered(preview ? null : `ziplume:rsvp:${slug.toUpperCase()}`);
  const [input, setInput] = useState<RsvpInput>({ name: "", email: "", guests: 1, note: "" });
  const [tried, setTried] = useState(false);
  const [state, setState] = useState<
    "idle" | "sending" | "done" | "already" | "fewer" | "error" | "limited" | "closed"
  >("idle");

  useEffect(() => {
    if (preview || capacity === null) return;
    let active = true;
    fetch(`/p/${encodeURIComponent(slug)}/rsvp`)
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { left?: unknown } | null) => {
        if (active && typeof body?.left === "number") setFetched(body.left);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [slug, preview, capacity]);

  const choices = guestChoices(left);
  const guests = Math.min(input.guests, Math.max(choices.length, 1));
  const errors = tried ? rsvpErrors({ ...input, guests }, left) : {};
  const set = (patch: Partial<RsvpInput>) => setInput((old) => ({ ...old, ...patch }));
  const times = eventTimes(event);

  async function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (preview) return;
    const form = formEvent.currentTarget;
    const found = rsvpErrors({ ...input, guests }, left);
    setTried(true);
    const first = ORDER.find((key) => found[key]);
    if (first) {
      (form.elements.namedItem(first) as HTMLElement | null)?.focus();
      return;
    }
    const website = new FormData(form).get("website") ?? "";
    setState("sending");
    try {
      const response = await fetch(`/p/${encodeURIComponent(slug)}/rsvp`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...input, guests, website }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        already?: boolean;
        error?: string;
        left?: unknown;
      };
      if (response.ok) {
        remember(JSON.stringify({ guests }));
        setState(body.already ? "already" : "done");
      } else if (body.error === "full" && typeof body.left === "number") {
        setFetched(body.left);
        setState(body.left > 0 ? "fewer" : "idle");
      } else {
        setState(
          response.status === 429 ? "limited" : response.status === 409 ? "closed" : "error",
        );
      }
    } catch {
      setState("error");
    }
  }

  let body: ReactNode;
  if (state === "done" || state === "already" || raw !== null) {
    body = <Listed already={state === "already"} />;
  } else if (now !== null && times && now >= times.end.getTime()) {
    body = <p className="text-fg-muted">RSVPs have closed.</p>;
  } else if (left === 0) {
    body = <p className="font-semibold text-fg">This event is full.</p>;
  } else {
    body = (
      <form noValidate onSubmit={submit} className="flex flex-col gap-4">
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
        <div className="flex flex-col gap-1.5">
          <label htmlFor={guestsId} className="text-sm font-medium text-fg">
            Guests, including you
          </label>
          <select
            id={guestsId}
            name="guests"
            value={guests}
            onChange={(e) => set({ guests: Number(e.target.value) })}
            className="h-12 rounded-xl border border-field-border bg-surface px-3.5 text-base text-fg focus-visible:outline-2 focus-visible:outline-[var(--page-accent)]"
          >
            {choices.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
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
        <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
        <button
          type="submit"
          className={pageButton.primary}
          disabled={state === "sending" || preview}
        >
          {state === "sending" ? "Sending…" : "Send RSVP"}
        </button>
        {state === "fewer" && left !== null && (
          <p role="alert" className="text-center text-sm text-fg">
            {left === 1 ? "Only 1 place is left." : `Only ${left} places are left.`} Pick fewer
            guests.
          </p>
        )}
        {state === "error" && (
          <p role="alert" className="text-center text-sm text-danger">
            Your RSVP couldn’t be sent. Please try again.
          </p>
        )}
        {state === "limited" && (
          <p role="alert" className="text-center text-sm text-fg-muted">
            Thanks, you’ve already sent RSVPs today.
          </p>
        )}
        {state === "closed" && (
          <p role="alert" className="text-center text-sm text-fg-muted">
            This event isn’t taking RSVPs any more.
          </p>
        )}
      </form>
    );
  }

  return (
    <section aria-labelledby={`${guestsId}-heading`}>
      <h2 id={`${guestsId}-heading`} className={heading}>
        RSVP
      </h2>
      {body}
    </section>
  );
}
