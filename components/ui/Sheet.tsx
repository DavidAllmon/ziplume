"use client";

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

import { IconButton } from "./Button";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Covers the whole screen (the editor's Preview on phones) instead of rising from the bottom. */
  fullScreen?: boolean;
  children: ReactNode;
}

/** A bottom sheet on small screens, used for the mobile preview and export options. */
export function Sheet({ open, onClose, title, fullScreen = false, children }: SheetProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-slate-950/50 backdrop-blur-[2px] transition-opacity duration-200 data-closed:opacity-0"
      />
      <div className={cn("fixed inset-x-0 bottom-0 flex", fullScreen ? "top-0" : "max-h-[92dvh]")}>
        <DialogPanel
          transition
          className={cn(
            "flex w-full flex-col bg-surface shadow-pop transition duration-250 ease-out data-closed:translate-y-full",
            fullScreen
              ? "pt-[env(safe-area-inset-top)]"
              : "rounded-t-[1.5rem] border-t border-border",
          )}
        >
          <div className="flex items-center justify-between px-5 pt-3 pb-1">
            {!fullScreen && (
              <span
                aria-hidden
                className="absolute top-2 left-1/2 h-1 w-10 -translate-x-1/2 rounded-full bg-border"
              />
            )}
            <DialogTitle className="mt-2 font-display text-lg font-bold">{title}</DialogTitle>
            <IconButton label="Close" onClick={onClose} className="-mr-2">
              <X aria-hidden />
            </IconButton>
          </div>
          <div
            className={cn(
              "overflow-y-auto overscroll-contain px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]",
              fullScreen && "flex-1",
            )}
          >
            {children}
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
