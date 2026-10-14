"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/inputs";
import { getBrowserSupabase } from "@/lib/supabase/client";

import { FormAlert } from "./AuthCard";
import { GoogleButton, OrDivider } from "./GoogleButton";
import { authErrorMessage } from "./messages";
import { PasswordInput } from "./PasswordInput";

export function LoginForm({ next, initialError }: { next: string; initialError?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError ?? "");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [unconfirmed, setUnconfirmed] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setPending(true);
    setError("");
    setNotice("");
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setPending(false);
      setUnconfirmed(signInError.code === "email_not_confirmed");
      setError(authErrorMessage(signInError));
      return;
    }
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    const destination =
      aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2"
        ? `/login/verify?next=${encodeURIComponent(next)}`
        : next;
    router.replace(destination);
    router.refresh();
  }

  async function resendConfirmation() {
    const supabase = getBrowserSupabase();
    if (!supabase || !email) return;
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/codes` },
    });
    if (resendError) setError(authErrorMessage(resendError));
    else {
      setError("");
      setNotice(`We sent a new confirmation link to ${email}.`);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <GoogleButton next={next} onError={setError} />
      <OrDivider />
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
        <Field
          label="Password"
          labelAction={
            <Link
              href="/forgot-password"
              className="ml-auto text-sm font-medium text-link underline-offset-4 hover:underline"
            >
              Forgot password?
            </Link>
          }
        >
          {(control) => (
            <PasswordInput
              {...control}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
        <FormAlert>{error}</FormAlert>
        <FormAlert tone="success">{notice}</FormAlert>
        {unconfirmed && (
          <Button variant="outline" onClick={resendConfirmation}>
            Send a new confirmation link
          </Button>
        )}
        <Button type="submit" size="lg" disabled={pending || !email || !password}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
