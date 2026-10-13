"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/inputs";
import { getBrowserSupabase } from "@/lib/supabase/client";

import { FormAlert } from "./AuthCard";
import { authErrorMessage } from "./messages";

/** Second step of sign-in for accounts with an authenticator app. */
export function MfaChallengeForm({ next }: { next: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setPending(true);
    setError("");
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp.find((f) => f.status === "verified");
    if (listError || !factor) {
      setPending(false);
      setError(authErrorMessage(listError) || "No authenticator app is set up for this account.");
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: factor.id,
      code,
    });
    if (verifyError) {
      setPending(false);
      setError(authErrorMessage(verifyError));
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field
          label="6-digit code"
          hint="Open your authenticator app and enter the code for QuickQReate."
        >
          {(control) => (
            <TextInput
              {...control}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              className="text-center font-mono text-xl tracking-[0.4em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          )}
        </Field>
        <FormAlert>{error}</FormAlert>
        <Button type="submit" size="lg" disabled={pending || code.length !== 6}>
          {pending ? "Checking…" : "Verify"}
        </Button>
      </form>
      <form action="/auth/signout" method="post" className="text-center">
        <button
          type="submit"
          className="text-sm font-medium text-link underline-offset-4 hover:underline"
        >
          Use a different account
        </button>
      </form>
    </div>
  );
}
