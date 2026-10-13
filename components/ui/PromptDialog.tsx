"use client";

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { useState, type FormEvent } from "react";

import { Button } from "./Button";
import { Field } from "./Field";
import { TextInput } from "./inputs";

interface PromptDialogProps {
  open: boolean;
  title: string;
  label: string;
  initialValue?: string;
  confirmLabel: string;
  maxLength?: number;
  /** Returns an error message to show, or nothing when it worked. */
  onSubmit: (value: string) => Promise<string | void>;
  onClose: () => void;
}

/** A small dialog that asks for one line of text, such as a folder name. */
export function PromptDialog({ open, onClose, ...props }: PromptDialogProps) {
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
          {/* Remounted on each open so the field starts from initialValue. */}
          {open && <PromptForm {...props} onClose={onClose} />}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

function PromptForm({
  title,
  label,
  initialValue = "",
  confirmLabel,
  maxLength = 60,
  onSubmit,
  onClose,
}: Omit<PromptDialogProps, "open">) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!value.trim()) return setError("This can’t be empty.");
    setPending(true);
    const problem = await onSubmit(value.trim());
    setPending(false);
    if (problem) setError(problem);
  }

  return (
    <form onSubmit={submit}>
      <DialogTitle className="font-display text-lg font-bold text-fg">{title}</DialogTitle>
      <Field label={label} error={error} className="mt-4">
        {(control) => (
          <TextInput
            {...control}
            autoFocus
            maxLength={maxLength}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        )}
      </Field>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : confirmLabel}
        </Button>
      </div>
    </form>
  );
}
