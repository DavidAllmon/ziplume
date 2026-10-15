"use client";

import { ArrowLeft, Loader2, Plus, Save } from "lucide-react";
import Link from "next/link";
import { useId } from "react";

import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/inputs";
import { TYPE_ICONS } from "@/features/generator/content/registry";
import { MAX_CODE_NAME } from "@/features/generator/state/defaults";
import type { CodeTypeId } from "@/lib/qr/types";

import { galleryLabel } from "./gallery/gallery";
import type { Problem } from "./tabs";

export interface EditorTopBarProps {
  mode: "create" | "edit";
  type: CodeTypeId;
  /** Create: the gallery ("Change type"). Edit: the code's page ("Back to …"). */
  back: { href: string; label: string };
  name: string;
  namePlaceholder: string;
  onName: (name: string) => void;
  /** Edit: whether anything differs from the saved code. */
  dirty: boolean;
  onDiscard?: () => void;
  submitting: boolean;
  onSubmit: () => void;
  problem: Problem | null;
  onShowMe: () => void;
  /** Why the last save failed, until the next change. */
  error: string | null;
}

/** Above the tabs: back, what's being made, its name, and the one Create (or Save) button with
 * what's still missing. */
export function EditorTopBar({
  mode,
  type,
  back,
  name,
  namePlaceholder,
  onName,
  dirty,
  onDiscard,
  submitting,
  onSubmit,
  problem,
  onShowMe,
  error,
}: EditorTopBarProps) {
  const editing = mode === "edit";
  const reasonId = useId();
  const Icon = TYPE_ICONS[type];
  return (
    <div
      role="region"
      aria-label="Code"
      className="sticky top-14 z-20 flex flex-col gap-2 border-b border-border bg-bg/95 py-3 backdrop-blur-md sm:top-0"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Link
          href={back.href}
          aria-label={back.label}
          className="grid size-11 shrink-0 place-items-center rounded-control text-fg-muted focus-ring hover:bg-surface-2 hover:text-fg"
        >
          <ArrowLeft aria-hidden className="size-5" />
        </Link>
        <h1 className="flex shrink-0 items-center gap-2 font-display text-lg font-bold tracking-tight text-fg">
          <Icon aria-hidden className="size-5 shrink-0" />
          <span>
            {/* The space sits outside the hidden word so the name reads "New Link list". */}
            <span className="sr-only">{editing ? "Edit" : "New"}</span> {galleryLabel(type)}
          </span>
        </h1>
        <TextInput
          aria-label="Code name"
          placeholder={namePlaceholder}
          maxLength={MAX_CODE_NAME}
          value={name}
          onChange={(event) => onName(event.target.value)}
          className="min-w-0 flex-1 basis-48"
        />
        {editing && dirty && !submitting && onDiscard && (
          <span className="flex items-center gap-2">
            <span className="text-sm text-fg-muted">Unsaved changes</span>
            <Button variant="ghost" onClick={onDiscard}>
              Discard changes
            </Button>
          </span>
        )}
        {/* Phones keep this button in the bar at the bottom of the screen. */}
        <Button
          onClick={onSubmit}
          disabled={problem !== null || submitting || (editing && !dirty)}
          aria-describedby={problem ? reasonId : undefined}
          className="max-md:hidden"
        >
          {submitting ? (
            <Loader2 aria-hidden className="animate-spin" />
          ) : editing ? (
            <Save aria-hidden />
          ) : (
            <Plus aria-hidden />
          )}
          {submitting
            ? editing
              ? "Saving…"
              : "Creating…"
            : editing
              ? "Save changes"
              : "Create code"}
        </Button>
      </div>
      {problem && (
        <p
          id={reasonId}
          className="flex flex-wrap items-center justify-end gap-x-2 text-sm text-fg-muted max-md:hidden"
        >
          {problem.message}
          <button
            type="button"
            onClick={onShowMe}
            className="min-h-11 rounded-control px-1 font-semibold text-link underline underline-offset-4 focus-ring"
          >
            Show me
          </button>
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger md:text-right">
          {error}
        </p>
      )}
    </div>
  );
}
