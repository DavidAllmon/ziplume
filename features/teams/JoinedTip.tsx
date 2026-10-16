"use client";

import { ArrowUp, X } from "lucide-react";
import { useEffect, useState } from "react";

/** Shown once after accepting an invite (teams spec 5): where to switch between people. */
export function JoinedTip({ ownerName }: { ownerName: string }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    // Nothing is stored for it; dropping ?joined means a reload won't show it again.
    const url = new URL(window.location.href);
    url.searchParams.delete("joined");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);
  if (!open) return null;
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-control border border-primary bg-primary-soft px-4 py-3 text-sm text-fg"
    >
      {/* Points at the switch row just above. */}
      <ArrowUp aria-hidden className="mt-0.5 size-4 shrink-0" />
      <p className="flex-1">You’re in {ownerName}’s team now. Switch between people here.</p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => setOpen(false)}
        className="-m-2 grid size-11 shrink-0 place-items-center rounded-control focus-ring hover:bg-surface sm:size-9"
      >
        <X aria-hidden className="size-4" />
      </button>
    </div>
  );
}
