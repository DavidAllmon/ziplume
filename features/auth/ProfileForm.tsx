"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/inputs";
import { useToast } from "@/components/ui/Toast";
import { ProfilePhoto } from "@/features/profile/ProfilePhoto";
import { announceProfile } from "@/features/profile/useProfile";
import { getBrowserSupabase } from "@/lib/supabase/client";

import { FormAlert } from "./AuthCard";

export function ProfileForm({
  userId,
  email,
  initialName,
  avatarUrl,
  googlePhoto,
}: {
  userId: string;
  email: string;
  initialName: string;
  avatarUrl: string | null;
  googlePhoto: string | null;
}) {
  const toast = useToast();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setPending(true);
    setError("");
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ display_name: name.trim() || null })
      .eq("id", userId);
    setPending(false);
    if (updateError) setError("Your name couldn't be saved. Please try again.");
    else {
      announceProfile({ display_name: name.trim() || null });
      toast("Profile saved");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <ProfilePhoto
        userId={userId}
        name={name}
        email={email}
        initialUrl={avatarUrl}
        googlePhoto={googlePhoto}
      />
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Email" hint="The address you sign in with.">
          {(control) => <TextInput {...control} value={email} readOnly disabled />}
        </Field>
        <Field label="Name" optional>
          {(control) => (
            <TextInput
              {...control}
              autoComplete="name"
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </Field>
        <FormAlert>{error}</FormAlert>
        <div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}
