"use client";

import { ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/inputs";
import { useToast } from "@/components/ui/Toast";
import { getBrowserSupabase } from "@/lib/supabase/client";

import { FormAlert } from "./AuthCard";
import { authErrorMessage } from "./messages";

interface Enrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

/** Optional two-step verification with an authenticator app (TOTP). */
export function TotpSettings() {
  const toast = useToast();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);

  useEffect(() => {
    let active = true;
    getBrowserSupabase()
      ?.auth.mfa.listFactors()
      .then(({ data }) => {
        if (!active) return;
        setFactorId(data?.totp.find((f) => f.status === "verified")?.id ?? null);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [version]);

  async function startEnrollment() {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setError("");
    // Clear abandoned, unverified attempts so a fresh QR code can be created.
    const { data: existing } = await supabase.auth.mfa.listFactors();
    for (const factor of existing?.all ?? []) {
      if (factor.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}`,
    });
    if (enrollError || !data) {
      setError(authErrorMessage(enrollError));
      return;
    }
    setEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  }

  async function verify(event: FormEvent) {
    event.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase || !enrollment) return;
    setPending(true);
    setError("");
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({
      factorId: enrollment.factorId,
      code,
    });
    setPending(false);
    if (verifyError) {
      setError(authErrorMessage(verifyError));
      return;
    }
    setEnrollment(null);
    setCode("");
    toast("Two-step verification is on");
    refresh();
  }

  async function turnOff() {
    const supabase = getBrowserSupabase();
    if (!supabase || !factorId) return;
    setPending(true);
    const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });
    setPending(false);
    if (unenrollError) {
      setError(authErrorMessage(unenrollError));
      return;
    }
    toast("Two-step verification is off");
    refresh();
  }

  if (loading) return <p className="text-sm text-fg-muted">Loading…</p>;

  if (factorId) {
    return (
      <div className="flex flex-col gap-3">
        <p className="flex items-center gap-2 text-sm font-medium text-success">
          <ShieldCheck aria-hidden className="size-4" /> On. You’ll enter a code from your
          authenticator app when you sign in.
        </p>
        <FormAlert>{error}</FormAlert>
        <div>
          <Button variant="outline" onClick={turnOff} disabled={pending}>
            Turn off two-step verification
          </Button>
        </div>
      </div>
    );
  }

  if (enrollment) {
    return (
      <form onSubmit={verify} className="flex flex-col gap-4">
        <ol className="list-decimal space-y-1 pl-5 text-sm text-fg-muted">
          <li>Open an authenticator app such as Google Authenticator, 1Password or Authy.</li>
          <li>Scan this code, or enter the key below by hand.</li>
          <li>Type the 6-digit code the app shows.</li>
        </ol>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- SVG data URL from the Auth server */}
          <img
            src={enrollment.qrCode}
            alt="QR code for your authenticator app"
            className="size-44 rounded-lg bg-white p-2"
          />
          <div className="min-w-0 text-sm">
            <p className="font-medium text-fg">Setup key</p>
            <code className="block rounded-lg bg-surface-2 px-3 py-2 font-mono text-xs break-all text-fg">
              {enrollment.secret}
            </code>
          </div>
        </div>
        <Field label="6-digit code">
          {(control) => (
            <TextInput
              {...control}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              className="max-w-48 font-mono tracking-[0.3em]"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
          )}
        </Field>
        <FormAlert>{error}</FormAlert>
        <div className="flex gap-2">
          <Button type="submit" disabled={pending || code.length !== 6}>
            {pending ? "Checking…" : "Turn on"}
          </Button>
          <Button variant="ghost" onClick={() => setEnrollment(null)}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-fg-muted">
        Add a second step at sign-in with a code from an authenticator app. Recommended if your
        codes are printed on things people rely on.
      </p>
      <FormAlert>{error}</FormAlert>
      <div>
        <Button variant="outline" onClick={startEnrollment}>
          Set up two-step verification
        </Button>
      </div>
    </div>
  );
}
