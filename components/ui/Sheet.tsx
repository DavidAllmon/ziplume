"use client";

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { IconButton } from "./Button";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** A bottom sheet on small screens, used for the mobile preview and export options. */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-[2px] transition-opacity duration-200 data-closed:opacity-0"
      />
      <div className="fixed inset-x-0 bottom-0 flex max-h-[92dvh]">
        <DialogPanel
          transition
          className="flex w-full flex-col rounded-t-[1.5rem] border-t border-border bg-surface shadow-pop transition duration-250 ease-out data-closed:translate-y-full"
        >
          <div className="flex items-center justify-between px-5 pt-3 pb-1">
            <span
              aria-hidden
              className="absolute top-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-border"
            />
            <DialogTitle className="mt-2 font-display text-lg font-bold">{title}</DialogTitle>
            <IconButton label="Close" onClick={onClose} className="-mr-2">
              <X aria-hidden />
            </IconButton>
          </div>
          <div className="overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {children}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
