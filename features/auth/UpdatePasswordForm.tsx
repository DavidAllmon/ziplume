"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { getBrowserSupabase } from "@/lib/supabase/client";

import { FormAlert } from "./AuthCard";
import { authErrorMessage } from "./messages";
import { PasswordInput } from "./PasswordInput";
import { MIN_PASSWORD_LENGTH } from "./SignupForm";

export function UpdatePasswordForm({ redirectTo }: { redirectTo?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const mismatch = confirm.length > 0 && confirm !== password;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase || mismatch) return;
    setPending(true);
    setError("");
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setPending(false);
    if (updateError) {
      setError(authErrorMessage(updateError));
      return;
    }
    toast("Password updated");
    setPassword("");
    setConfirm("");
    if (redirectTo) {
      router.replace(redirectTo);
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field label="New password" hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}>
        {(control) => (
          <PasswordInput
            {...control}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        )}
      </Field>
      <Field
        label="Confirm new password"
        error={mismatch ? "The passwords don't match." : undefined}
      >
        {(control) => (
          <PasswordInput
            {...control}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        )}
      </Field>
      <FormAlert>{error}</FormAlert>
      <Button
        type="submit"
        disabled={pending || password.length < MIN_PASSWORD_LENGTH || password !== confirm}
      >
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
