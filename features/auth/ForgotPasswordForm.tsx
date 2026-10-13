"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/inputs";
import { getBrowserSupabase } from "@/lib/supabase/client";

import { FormAlert } from "./AuthCard";
import { authErrorMessage } from "./messages";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setPending(true);
    setError("");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/account/update-password`,
    });
    setPending(false);
    if (resetError) setError(authErrorMessage(resetError));
    else setSent(true);
  }

  if (sent) {
    return (
      <FormAlert tone="success">
        If {email} has an account, a reset link is on its way. The link works once and expires after
        an hour.
      </FormAlert>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field label="Email">
        {(control) => (
          <TextInput
            {...control}
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        )}
      </Field>
      <FormAlert>{error}</FormAlert>
      <Button type="submit" size="lg" disabled={pending || !email}>
        {pending ? "Sending…" : "Send reset link"}
      </Button>
    </form>
  );
}
