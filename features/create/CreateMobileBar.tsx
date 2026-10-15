"use client";

import { ChevronUp, Loader2, Plus, Save } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { QrTile } from "@/features/generator/preview/QrTile";

import type { DeviceId } from "@/features/pages/preview/devices";

import { PreviewColumn, type CreateControls, type PreviewView } from "./PreviewColumn";
import type { CodeDraft } from "./useCodeDraft";

/** Phones: a small live preview above the bottom tabs; tap it for the full preview. */
export function CreateMobileBar({
  draft,
  view,
  onViewChange,
  device,
  onDeviceChange,
  liveHref,
  ...controls
}: {
  draft: CodeDraft;
  view: PreviewView;
  onViewChange: (view: PreviewView) => void;
  device: DeviceId;
  onDeviceChange: (device: DeviceId) => void;
  liveHref: string | null;
} & CreateControls) {
  const [open, setOpen] = useState(false);
  const { renderOptions, summary, info, blocker } = draft;
  const { mode, submitting, onSubmit, error, dirty = false } = controls;
  const editing = mode === "edit";
  return (
    <>
      <div
        data-actionbar="create"
        className="fixed inset-x-0 bottom-(--tabbar-h) z-20 border-t border-border bg-surface/95 shadow-pop backdrop-blur-md sm:pb-[env(safe-area-inset-bottom)] md:hidden"
      >
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
              <span
                className={
                  error ? "truncate text-[13px] text-danger" : "truncate text-[13px] text-fg-muted"
                }
              >
                {error ?? blocker ?? summary}
              </span>
            </span>
          </button>
          <Button
            onClick={onSubmit}
            disabled={blocker !== null || submitting || (editing && !dirty)}
            className="px-4"
          >
            {submitting ? (
              <Loader2 aria-hidden className="animate-spin" />
            ) : editing ? (
              <Save aria-hidden />
            ) : (
              <Plus aria-hidden />
            )}
            {submitting ? (editing ? "Saving…" : "Creating…") : editing ? "Save" : "Create"}
          </Button>
        </div>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title="Preview">
        <div className="pt-2">
          <PreviewColumn
            draft={draft}
            view={view}
            onViewChange={onViewChange}
            device={device}
            onDeviceChange={onDeviceChange}
            liveHref={liveHref}
            // Leaves room to see the sheet's other controls, and to scroll it past the frame.
            frameHeight="min(560px, 55dvh)"
            mode={mode}
          />
        </div>
      </Sheet>
    </>
  );
}
