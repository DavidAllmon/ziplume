"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, buttonClasses } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/inputs";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/features/auth/useSession";
import { accountsEnabled } from "@/lib/env";

import { MAX_CODE_NAME } from "./state/defaults";
import type { Generator } from "./useGenerator";

/** Saves the current code to your account, then opens its page. */
export function SavePanel({ generator }: { generator: Generator }) {
  const { user, loading } = useSession();
  const router = useRouter();
  const toast = useToast();
  const { defaultName, save, data, isDynamic } = generator;
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
    const result = await save(name);
    toast(result.message, result.ok ? "success" : "error");
    if (result.ok) {
      router.push(`/codes/${result.id}`);
      return;
    }
    setPending(false);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <Field label="Save to my codes">
        {(control) => (
          <TextInput
            {...control}
            placeholder={defaultName}
            maxLength={MAX_CODE_NAME}
            value={name}
            onChange={(e) => generator.setName(e.target.value)}
          />
        )}
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button
          type="submit"
          variant={isDynamic ? "primary" : "outline"}
          disabled={pending || !data}
        >
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </form>
  );
}
