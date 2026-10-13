"use client";

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle, Description } from "@headlessui/react";
import type { ReactNode } from "react";

import { Button } from "./Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  danger,
  pending,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-slate-950/50 transition-opacity duration-200 data-closed:opacity-0"
      />
      <div className="fixed inset-0 grid place-items-center p-4">
        <DialogPanel
          transition
          className="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-pop transition duration-200 data-closed:scale-95 data-closed:opacity-0"
        >
          <DialogTitle className="font-display text-lg font-bold text-fg">{title}</DialogTitle>
          <Description as="div" className="mt-2 text-sm text-fg-muted">
            {description}
          </Description>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={pending}
              className={
                danger ? "bg-danger text-white hover:bg-danger hover:opacity-90" : undefined
              }
            >
              {pending ? "Working…" : confirmLabel}
            </Button>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
