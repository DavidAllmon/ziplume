"use client";

import { CircleCheck, TicketCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { couponDeadlineText, localDate } from "@/lib/pages/countdown";

import { pageButton } from "./parts";
import { useMinute } from "./useMinute";
import { useRemembered } from "./useRemembered";

interface Remembered {
  /** This phone's random ID for the coupon; the server keeps only a one-way hash of it. */
  id: string;
  usedAt?: string;
}

function parse(raw: string | null): Remembered | null {
  try {
    const value: unknown = raw ? JSON.parse(raw) : null;
    if (!value || typeof value !== "object") return null;
    const { id, usedAt } = value as Record<string, unknown>;
    if (typeof id !== "string" || !/^[0-9a-f]{32}$/.test(id)) return null;
    return { id, usedAt: typeof usedAt === "string" ? usedAt : undefined };
  } catch {
    return null;
  }
}

function newPhoneId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

const usedOn = (iso: string) =>
  new Date(iso).toLocaleString("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/** "Mark as used", for the till: once per phone, then "Used on this phone" (spec item 29). */
export function MarkUsed({
  slug,
  validUntil,
  preview,
}: {
  slug: string;
  validUntil: string;
  preview?: boolean;
}) {
  const now = useMinute();
  const [raw, remember] = useRemembered(preview ? null : `ziplume:coupon:${slug.toUpperCase()}`);
  const saved = useMemo(() => parse(raw), [raw]);
  // When storage is blocked, this phone's use lasts until the page closes.
  const [usedNow, setUsedNow] = useState<string | null>(null);
  const [step, setStep] = useState<"idle" | "confirm" | "sending" | "error" | "limited" | "closed">(
    "idle",
  );
  const yes = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (step === "confirm") yes.current?.focus();
  }, [step]);

  const usedAt = saved?.usedAt ?? usedNow;
  if (usedAt) {
    return (
      <p role="status" className="flex flex-col items-center gap-0.5 text-center">
        <span className="flex items-center gap-2 font-semibold text-fg">
          <CircleCheck aria-hidden className="size-5 text-(--page-accent)" />
          Used on this phone
        </span>
        <span className="text-sm text-fg-muted">{usedOn(usedAt)}</span>
      </p>
    );
  }
  // Ended on this phone's own date, as the deadline above it says (ruling 3).
  if (
    now !== null &&
    couponDeadlineText(validUntil, localDate(new Date(now))) === "This offer has ended"
  ) {
    return null;
  }

  async function confirm() {
    const id = saved?.id ?? newPhoneId();
    // Kept before sending, so trying again after a lost answer is the same phone.
    remember(JSON.stringify({ id }));
    setStep("sending");
    try {
      const response = await fetch(`/p/${encodeURIComponent(slug)}/redeem`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ phone: id }),
      });
      if (response.ok) {
        const at = new Date().toISOString();
        remember(JSON.stringify({ id, usedAt: at }));
        setUsedNow(at);
        return;
      }
      setStep(response.status === 429 ? "limited" : response.status === 409 ? "closed" : "error");
    } catch {
      setStep("error");
    }
  }

  if (step === "confirm" || step === "sending") {
    return (
      <div className="flex w-full flex-col gap-3">
        <p className="font-semibold text-fg">Mark this coupon as used?</p>
        <p className="text-sm text-fg-muted">Do this at the till. It can’t be undone.</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={pageButton.secondary}
            disabled={step === "sending"}
            onClick={() => setStep("idle")}
          >
            Not yet
          </button>
          <button
            ref={yes}
            type="button"
            className={pageButton.primary}
            disabled={step === "sending"}
            onClick={() => void confirm()}
          >
            {step === "sending" ? "Marking…" : "Yes, mark it used"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-2">
      {preview ? (
        <span className={pageButton.secondary} aria-disabled>
          <TicketCheck aria-hidden /> Mark as used
        </span>
      ) : (
        <button type="button" className={pageButton.secondary} onClick={() => setStep("confirm")}>
          <TicketCheck aria-hidden /> Mark as used
        </button>
      )}
      {step === "error" && (
        <p role="alert" className="text-sm text-danger">
          It couldn’t be marked as used. Please try again.
        </p>
      )}
      {step === "limited" && (
        <p role="alert" className="text-sm text-fg-muted">
          Too many tries today. Please show this coupon to staff.
        </p>
      )}
      {step === "closed" && (
        <p role="alert" className="text-sm text-fg-muted">
          This coupon can’t be marked as used any more.
        </p>
      )}
    </div>
  );
}
