"use client";

import { couponDeadlineText, formatDay, localDate } from "@/lib/pages/countdown";

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
