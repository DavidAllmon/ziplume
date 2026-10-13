"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { FormAlert } from "@/features/auth/AuthCard";
import { acceptInvite, type AcceptResult } from "@/app/(auth)/invite/[token]/actions";

export function AcceptInviteForm({ token, role }: { token: string; role: string }) {
  const [state, action, pending] = useActionState<AcceptResult>(() => acceptInvite(token), {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormAlert>{state.error}</FormAlert>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Joining…" : `Join as ${role}`}
      </Button>
    </form>
  );
}
