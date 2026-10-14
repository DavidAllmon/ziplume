"use client";

import { Check, LayoutGrid, Plus, Users } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button, buttonClasses } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/inputs";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/features/auth/useSession";
import { accountsEnabled, shortLinkLabel } from "@/lib/env";

import { MAX_CODE_NAME } from "./state/defaults";
import type { Generator } from "./useGenerator";

/** Save the current code to the account, or update the saved code being edited. */
export function SavePanel({ generator }: { generator: Generator }) {
  const { user, loading } = useSession();
  const toast = useToast();
  const { saved, defaultName, save, data, isDynamic, workspace } = generator;
  const name = generator.state.name;
  const [pending, setPending] = useState(false);

  if (!accountsEnabled || loading) return null;

  if (!user) {
    return (
      <div className="flex flex-col gap-2 rounded-control bg-surface-2 p-4 text-sm">
        <p className="text-fg-muted">
          <strong className="font-semibold text-fg">Save your codes for later.</strong> A free
          account keeps them in one place with editable links and scan analytics.
        </p>
        <div className="flex gap-2">
          <Link href="/signup?next=/" className={buttonClasses("primary", "sm")}>
            Create free account
          </Link>
          <Link href="/login?next=/" className={buttonClasses("ghost", "sm")}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    const result = await save(name || saved?.name || "");
    setPending(false);
    toast(result.message, result.ok ? "success" : "error");
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Field label={saved ? "Saved code" : "Save to my codes"}>
        {(control) => (
          <TextInput
            {...control}
            placeholder={saved?.name ?? defaultName}
            maxLength={MAX_CODE_NAME}
            value={name}
            onChange={(e) => generator.setName(e.target.value)}
          />
        )}
      </Field>
      {workspace && (
        <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-fg-muted">
          <Users aria-hidden className="size-4 text-primary dark:text-link" />
          <span>
            {saved ? "In" : "Saving to"}{" "}
            <strong className="font-semibold text-fg">{workspace.label}</strong>’s workspace
          </span>
          {!saved && (
            <button
              type="button"
              className="font-medium text-link underline-offset-4 hover:underline"
              onClick={generator.leaveWorkspace}
            >
              Use my account instead
            </button>
          )}
        </p>
      )}
      {saved?.slug && (
        <p className="flex items-center gap-1.5 text-sm text-fg-muted">
          <Check aria-hidden className="size-4 text-success" />
          Short link <span className="font-mono text-fg">{shortLinkLabel(saved.slug)}</span>
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          variant={isDynamic && !saved ? "primary" : "outline"}
          disabled={pending || !data}
        >
          {pending ? "Saving…" : saved ? "Save changes" : "Save"}
        </Button>
        {saved && (
          <>
            <Link href={`/codes/${saved.id}`} className={buttonClasses("ghost", "md")}>
              <LayoutGrid aria-hidden /> Open code page
            </Link>
            <Button variant="ghost" onClick={generator.startNew} disabled={pending}>
              <Plus aria-hidden /> New code
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
