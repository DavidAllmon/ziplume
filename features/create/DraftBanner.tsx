"use client";

import { History } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { relativePhrase } from "@/features/dashboard/format";

/** "You have an unfinished code from 2 hours ago." with Resume and Discard. */
export function DraftBanner({
  savedAt,
  onResume,
  onDiscard,
}: {
  savedAt: string;
  onResume: () => void;
  onDiscard: () => void;
}) {
  return (
    <div
      role="region"
      aria-label="Unfinished code"
      className="flex flex-col gap-3 rounded-card border border-border bg-surface-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-center gap-2 text-sm text-fg">
        <History aria-hidden className="size-4 shrink-0 text-fg-muted" />
        You have an unfinished code from {relativePhrase(savedAt)}.
      </p>
      <div className="flex gap-2">
        <Button onClick={onResume}>Resume</Button>
        <Button variant="ghost" onClick={onDiscard}>
          Discard
        </Button>
      </div>
    </div>
  );
}
