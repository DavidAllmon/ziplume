"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/inputs";
import { deleteAccount, type ActionResult } from "@/app/account/actions";

import { FormAlert } from "./AuthCard";

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState<ActionResult, FormData>(deleteAccount, {});
  const [confirm, setConfirm] = useState("");
  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-sm text-fg-muted">
        This permanently deletes your account, every saved code and all scan history. Dynamic codes
        stop redirecting. This can’t be undone.
      </p>
      <Field label="Type DELETE to confirm">
        {(control) => (
          <TextInput
            {...control}
            name="confirm"
            autoComplete="off"
            className="max-w-60"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        )}
      </Field>
      <FormAlert>{state.error}</FormAlert>
      <div>
        <Button
          type="submit"
          disabled={pending || confirm !== "DELETE"}
          className="bg-danger text-white hover:bg-danger hover:opacity-90"
        >
          {pending ? "Deleting…" : "Delete my account"}
        </Button>
      </div>
    </form>
  );
}
