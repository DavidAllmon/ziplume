"use client";

import { MailCheck } from "lucide-react";
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

export const MIN_PASSWORD_LENGTH = 8;

export function SignupForm({ next }: { next: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState("");

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase || tooShort) return;
    setPending(true);
    setError("");
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: name.trim() ? { full_name: name.trim() } : undefined,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setPending(false);
    if (signUpError) {
      setError(authErrorMessage(signUpError));
      return;
    }
    if (data.session) {
      // Email confirmation is turned off on this project: the user is already signed in.
      router.replace(next);
      router.refresh();
      return;
    }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-success-soft text-success">
          <MailCheck aria-hidden className="size-6" />
        </span>
        <h2 className="font-display text-lg font-bold text-fg">Check your email</h2>
        <p className="text-fg-muted">
          We sent a confirmation link to <strong className="text-fg">{sentTo}</strong>. Open it to
          finish creating your account. It can take a minute to arrive; check spam if you don’t see
          it.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <GoogleButton next={next} onError={setError} />
      <OrDivider />
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Field label="Name" optional>
          {(control) => (
            <TextInput
              {...control}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </Field>
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
          hint={`At least ${MIN_PASSWORD_LENGTH} characters. A short phrase is easy to remember.`}
          error={tooShort ? `Use at least ${MIN_PASSWORD_LENGTH} characters.` : undefined}
        >
          {(control) => (
            <PasswordInput
              {...control}
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
        </Field>
        <FormAlert>{error}</FormAlert>
        <Button
          type="submit"
          size="lg"
          disabled={pending || !email || password.length < MIN_PASSWORD_LENGTH}
        >
          {pending ? "Creating account…" : "Create free account"}
        </Button>
        <p className="text-center text-xs text-fg-muted">
          By creating an account you agree to the{" "}
          <a href="/terms" className="underline underline-offset-2">
            terms
          </a>{" "}
          and{" "}
          <a href="/privacy" className="underline underline-offset-2">
            privacy policy
          </a>
          .
        </p>
      </form>
    </div>
  );
}
