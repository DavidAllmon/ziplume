import { cn } from "@/lib/cn";

import { STATUS_LABELS, type ListStatus } from "./filters";

const TONES: Record<ListStatus, string> = {
  active: "bg-success-soft text-success",
  scheduled: "bg-warning-soft text-warning",
  expired: "bg-danger-soft text-danger",
  paused: "bg-neutral-soft text-neutral",
  static: "bg-neutral-soft text-neutral",
};

/** The one status a code shows in lists. */
export function StatusPill({ status, className }: { status: ListStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-[13px] font-medium whitespace-nowrap",
        TONES[status],
        className,
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
