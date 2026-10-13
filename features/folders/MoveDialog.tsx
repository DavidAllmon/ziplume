"use client";

import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
  Radio,
  RadioGroup,
} from "@headlessui/react";
import { Check, Folder, FolderMinus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import type { FolderRow } from "@/types/supabase";

interface MoveDialogProps {
  open: boolean;
  count: number;
  folders: FolderRow[];
  /** The folder the codes share now, if they all share one. */
  current: string | null;
  pending?: boolean;
  onMove: (folderId: string | null) => void;
  onClose: () => void;
}

const NONE = "none";

/** Picks the folder to move one or more codes into. */
export function MoveDialog({ open, onClose, ...props }: MoveDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-slate-950/50 transition-opacity duration-200 data-closed:opacity-0"
      />
      <div className="fixed inset-0 grid place-items-center p-4">
        <DialogPanel
          transition
          className="flex max-h-[85dvh] w-full max-w-md flex-col rounded-card border border-border bg-surface p-6 shadow-pop transition duration-200 data-closed:scale-95 data-closed:opacity-0"
        >
          {open && <MoveForm {...props} onClose={onClose} />}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

function MoveForm({
  count,
  folders,
  current,
  pending,
  onMove,
  onClose,
}: Omit<MoveDialogProps, "open">) {
  const [choice, setChoice] = useState(current ?? NONE);
  const options = [{ id: NONE, name: "No folder" }, ...folders];
  return (
    <>
      <DialogTitle className="font-display text-lg font-bold text-fg">
        Move {count === 1 ? "code" : `${count} codes`} to…
      </DialogTitle>
      <RadioGroup
        value={choice}
        onChange={setChoice}
        aria-label="Folder"
        className="mt-4 flex min-h-0 flex-col gap-1 overflow-y-auto"
      >
        {options.map((option) => (
          <Radio
            key={option.id}
            value={option.id}
            className="flex cursor-pointer items-center gap-3 rounded-control px-3 py-2.5 text-sm text-fg data-checked:bg-primary-soft data-checked:font-semibold data-focus:outline-2 data-focus:outline-ring"
          >
            {option.id === NONE ? (
              <FolderMinus aria-hidden className="size-4 text-fg-muted" />
            ) : (
              <Folder aria-hidden className="size-4 text-fg-muted" />
            )}
            <span className="min-w-0 flex-1 truncate">{option.name}</span>
            {choice === option.id && <Check aria-hidden className="size-4 text-primary-soft-fg" />}
          </Radio>
        ))}
      </RadioGroup>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={pending} onClick={() => onMove(choice === NONE ? null : choice)}>
          {pending ? "Moving…" : "Move"}
        </Button>
      </div>
    </>
  );
}
