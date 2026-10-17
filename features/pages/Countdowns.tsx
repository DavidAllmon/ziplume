"use client";

import { Video } from "lucide-react";

import {
  couponDeadlineText,
  eventCountdownText,
  formatDay,
  joinOpen,
  localDate,
} from "@/lib/pages/countdown";
import { eventTimes } from "@/lib/pages/files";
import type { EventPage } from "@/lib/pages/types";
import { safeHref } from "@/lib/pages/urls";

import { PageLink } from "./parts";
import { useMinute } from "./useMinute";

/** A coupon's end date, counting down its last week on the visitor's own date (spec item 27). */
export function CouponDeadline({ validUntil }: { validUntil: string }) {
  const now = useMinute();
  // On the server (and until the page loads), the plain date.
  const text =
    now === null
      ? validUntil && `Valid until ${formatDay(validUntil)}`
      : couponDeadlineText(validUntil, localDate(new Date(now)));
  if (!text) return null;
  const ended = text === "This offer has ended";
  const soon = !ended && !text.startsWith("Valid");
  return (
    <p
      className={
        ended
          ? "font-semibold text-danger"
          : soon
            ? "font-semibold text-fg"
            : "text-sm text-fg-muted"
      }
    >
      {text}
    </p>
  );
}

/** "Starts in 3 days 4 hours", updating each minute; nothing until the page loads (spec item 34). */
export function EventCountdown({ event }: { event: EventPage }) {
  const now = useMinute();
  if (now === null) return null;
  const text = eventCountdownText(eventTimes(event), new Date(now));
  if (!text) return null;
  const live = text === "Happening now";
  return (
    <p className="flex items-center gap-2 text-[15px] font-semibold text-fg">
      <span
        aria-hidden
        className={
          live ? "size-2.5 rounded-full bg-(--page-accent)" : "size-2.5 rounded-full bg-fg-muted"
        }
      />
      {text}
    </p>
  );
}

/** The online event's Join button: a link from 15 minutes before the start until the end. */
export function JoinButton({ event, preview }: { event: EventPage; preview?: boolean }) {
  const now = useMinute();
  const times = eventTimes(event);
  const href = safeHref(event.joinUrl);
  if (!event.online || !href) return null;
  if (now !== null && times && now >= times.end.getTime()) return null;
  // Inert in the preview, like every button there; outside its window, a note instead of a link.
  if (preview)
    return (
      <PageLink href={href} preview>
        <Video aria-hidden /> Join online
      </PageLink>
    );
  if (now !== null && joinOpen(times, new Date(now))) {
    return (
      <PageLink href={href}>
        <Video aria-hidden /> Join online
      </PageLink>
    );
  }
  return (
    <p className="flex min-h-12 items-center justify-center gap-2 rounded-(--pg-btn-radius) border-2 border-dashed border-border px-4 text-center text-sm text-fg-muted">
      <Video aria-hidden className="size-5 shrink-0" /> The link opens 15 minutes before the start
    </p>
  );
}
