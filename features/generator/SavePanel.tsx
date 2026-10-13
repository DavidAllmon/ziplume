"use client";

import { Check, LayoutGrid, Plus } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button, buttonClasses } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/inputs";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/features/auth/useSession";
import { accountsEnabled, shortLinkLabel } from "@/lib/env";

import type { Generator } from "./useGenerator";

/** Save the current code to the account, or update the saved code being edited. */
export function SavePanel({ generator }: { generator: Generator }) {
  const { user, loading } = useSession();
  const toast = useToast();
  const { saved, defaultName, save, data, isDynamic } = generator;
  const [name, setName] = useState("");
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
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}
      </Field>
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
            <Link href={`/dashboard/codes/${saved.id}`} className={buttonClasses("ghost", "md")}>
              <LayoutGrid aria-hidden /> Open in My codes
            </Link>
            <Button variant="ghost" onClick={generator.startNew}>
              <Plus aria-hidden /> New code
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
