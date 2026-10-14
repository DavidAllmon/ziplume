"use client";

import { ChevronUp, Loader2, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { QrTile } from "@/features/generator/preview/QrTile";

import { PreviewColumn, type CreateControls } from "./PreviewColumn";
import type { CodeDraft } from "./useCodeDraft";

/** Phones: a small live preview above the bottom tabs; tap it for the full preview. */
export function CreateMobileBar({
  draft,
  creating,
  onCreate,
}: { draft: CodeDraft } & CreateControls) {
  const [open, setOpen] = useState(false);
  const { renderOptions, summary, info, blocker } = draft;
  return (
    <>
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+1px+env(safe-area-inset-bottom))] z-20 border-t border-border bg-surface/95 shadow-pop backdrop-blur-md sm:bottom-0 sm:pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-2.5">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-control text-left focus-ring"
          >
            <QrTile
              compact
              options={renderOptions}
              summary={summary}
              emptyHint={info.emptyHint}
              resolution={192}
              className="size-12 shrink-0"
            />
            <span className="flex min-w-0 flex-col">
              <span className="flex items-center gap-1 text-sm font-semibold text-fg">
                Preview <ChevronUp aria-hidden className="size-4 text-fg-muted" />
              </span>
              <span className="truncate text-[13px] text-fg-muted">{blocker ?? summary}</span>
            </span>
          </button>
          <Button onClick={onCreate} disabled={blocker !== null || creating} className="px-4">
            {creating ? <Loader2 aria-hidden className="animate-spin" /> : <Plus aria-hidden />}
            {creating ? "Creating…" : "Create"}
          </Button>
        </div>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title="Preview">
        <div className="pt-2">
          <PreviewColumn draft={draft} creating={creating} onCreate={onCreate} />
        </div>
      </Sheet>
    </>
  );
}
