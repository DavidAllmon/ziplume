"use client";

import { KeyRound, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Button, IconButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/inputs";
import { useToast } from "@/components/ui/Toast";
import { CopyButton } from "@/features/dashboard/CopyButton";
import { relativePhrase } from "@/features/dashboard/format";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { ApiKeyRow } from "@/types/supabase";

type KeySummary = Pick<ApiKeyRow, "id" | "name" | "prefix" | "created_at" | "last_used_at">;

/** Personal API keys: created here, shown once, revocable at any time. */
export function ApiKeys({ keys }: { keys: KeySummary[] }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<{ key: string; name: string } | null>(null);
  const [revoking, setRevoking] = useState<KeySummary | null>(null);
  const [revokePending, setRevokePending] = useState(false);

  async function create(event: FormEvent) {
    event.preventDefault();
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const label = name.trim();
    if (!label) {
      setError("Give the key a name, like the app or script that will use it.");
      return;
    }
    setPending(true);
    setError("");
    const { data, error: rpcError } = await supabase.rpc("create_api_key", { p_name: label });
    setPending(false);
    const result = data as { key?: string } | null;
    if (rpcError || !result?.key) {
      setError(
        /up to 10/i.test(rpcError?.message ?? "")
          ? "You can have up to 10 keys. Revoke one you no longer use first."
          : "The key couldn’t be created. Please try again.",
      );
      return;
    }
    setCreated({ key: result.key, name: label });
    setName("");
    router.refresh();
  }

  async function revoke() {
    const supabase = getBrowserSupabase();
    if (!supabase || !revoking) return;
    setRevokePending(true);
    const { error: deleteError } = await supabase.from("api_keys").delete().eq("id", revoking.id);
    setRevokePending(false);
    if (deleteError) {
      toast("The key couldn’t be revoked. Please try again.", "error");
      return;
    }
    toast(`Revoked “${revoking.name}”`);
    setRevoking(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-fg-muted">
        Keys let your own scripts and apps create and manage your codes through the{" "}
        <Link
          href="/developers"
          className="font-medium text-link underline-offset-4 hover:underline"
        >
          Ziplume API
        </Link>
        . A key can do anything you can do with your codes, so keep it secret.
      </p>

      {created && (
        <div className="flex flex-col gap-3 rounded-control border border-primary/40 bg-primary-soft p-4">
          <p className="text-sm font-semibold text-fg">
            Your new key “{created.name}”. Copy it now: you won’t be able to see it again.
          </p>
          <div className="flex items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-surface px-3 py-2 font-mono text-sm break-all text-fg">
              {created.key}
            </code>
            <CopyButton text={created.key} label="Copy key" />
          </div>
          <div>
            <Button variant="outline" size="sm" onClick={() => setCreated(null)}>
              I’ve saved it
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={create} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Key name" className="flex-1" error={error}>
          {(control) => (
            <TextInput
              {...control}
              value={name}
              maxLength={60}
              placeholder="e.g. Inventory script"
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </Field>
        <Button type="submit" disabled={pending} className={error ? "sm:mb-7" : undefined}>
          <KeyRound aria-hidden />
          {pending ? "Creating…" : "Create key"}
        </Button>
      </form>

      {keys.length > 0 && (
        <ul className="divide-y divide-border rounded-control border border-border">
          {keys.map((key) => (
            <li key={key.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-fg">{key.name}</p>
                <p className="text-sm text-fg-muted">
                  <code className="font-mono">{key.prefix}…</code> · created{" "}
                  {relativePhrase(key.created_at)} · last used {relativePhrase(key.last_used_at)}
                </p>
              </div>
              <IconButton
                label={`Revoke ${key.name}`}
                size="icon-sm"
                onClick={() => setRevoking(key)}
              >
                <Trash2 aria-hidden />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={revoking !== null}
        title="Revoke this key?"
        description={`Anything using “${revoking?.name ?? ""}” stops working straight away.`}
        confirmLabel="Revoke key"
        danger
        pending={revokePending}
        onConfirm={revoke}
        onClose={() => setRevoking(null)}
      />
    </div>
  );
}
