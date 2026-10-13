"use client";

import { CalendarClock, Lock, LockOpen } from "lucide-react";
import { useState, useSyncExternalStore, type FormEvent } from "react";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/inputs";
import { useToast } from "@/components/ui/Toast";
import { setCodePassword, updateCode } from "@/features/codes/api";
import type { QrCodeRow } from "@/types/supabase";

/** "2026-11-14T19:00" in the viewer's time zone, for a datetime-local input. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

const noopSubscribe = () => () => {};

function stateOf(code: QrCodeRow, now = Date.now()) {
  if (code.status === "paused") return "Paused";
  if (code.active_from && Date.parse(code.active_from) > now) return "Scheduled";
  if (code.active_until && Date.parse(code.active_until) <= now) return "Expired";
  return "Live";
}

/** Password protection and active dates for a dynamic code. */
export function AccessCard({
  code,
  canEdit,
  onSaved,
}: {
  code: QrCodeRow;
  canEdit: boolean;
  onSaved: (code: QrCodeRow) => void;
}) {
  const toast = useToast();
  const [password, setPassword] = useState("");
  // The inputs show local times, which the server can't know: render them empty there and
  // fill them in once in the browser, so the HTML matches during hydration.
  const inBrowser = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const savedFrom = inBrowser ? toLocalInput(code.active_from) : "";
  const savedUntil = inBrowser ? toLocalInput(code.active_until) : "";
  const [fromDraft, setFrom] = useState<string | null>(null);
  const [untilDraft, setUntil] = useState<string | null>(null);
  const from = fromDraft ?? savedFrom;
  const until = untilDraft ?? savedUntil;
  const [busy, setBusy] = useState<string | null>(null);

  async function changePassword(next: string) {
    setBusy("password");
    const result = await setCodePassword(code.id, next);
    setBusy(null);
    if (!result.ok) return toast(result.error, "error");
    setPassword("");
    onSaved({ ...code, has_password: next !== "" });
    toast(next ? "Password set. Scanners now need it to open the code." : "Password removed");
  }

  async function saveDates(event: FormEvent) {
    event.preventDefault();
    setBusy("dates");
    const result = await updateCode(code.id, {
      activeFrom: fromLocalInput(from),
      activeUntil: fromLocalInput(until),
    });
    setBusy(null);
    if (!result.ok) return toast(result.error, "error");
    setFrom(null);
    setUntil(null);
    onSaved(result.value);
    toast("Active dates saved");
  }

  const datesChanged = from !== savedFrom || until !== savedUntil;

  return (
    <Card>
      <CardHeader
        title="Access & schedule"
        description="Require a password, or make the code work only between two dates."
        action={
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-fg-muted">
            {stateOf(code)}
          </span>
        }
      />
      <div className="flex flex-col gap-6 px-5 pt-4 pb-6 sm:px-6">
        <div className="flex flex-col gap-3">
          <p className="flex items-center gap-2 text-sm font-medium text-fg">
            {code.has_password ? (
              <Lock aria-hidden className="size-4 text-success" />
            ) : (
              <LockOpen aria-hidden className="size-4 text-fg-muted" />
            )}
            {code.has_password ? "Password protected" : "No password"}
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void changePassword(password);
            }}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <Field
              label={code.has_password ? "New password" : "Password"}
              className="flex-1"
              hint="4 to 128 characters. Share it with the people who should get in."
            >
              {(control) => (
                <TextInput
                  {...control}
                  type="password"
                  autoComplete="new-password"
                  minLength={4}
                  maxLength={128}
                  disabled={!canEdit}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              )}
            </Field>
            <div className="flex gap-2 sm:pb-6">
              <Button
                type="submit"
                variant="outline"
                disabled={!canEdit || busy !== null || password.length < 4}
              >
                {code.has_password ? "Change" : "Set password"}
              </Button>
              {code.has_password && (
                <Button
                  variant="ghost"
                  disabled={!canEdit || busy !== null}
                  onClick={() => void changePassword("")}
                >
                  Remove
                </Button>
              )}
            </div>
          </form>
        </div>

        <form onSubmit={saveDates} className="flex flex-col gap-3 border-t border-border pt-5">
          <p className="flex items-center gap-2 text-sm font-medium text-fg">
            <CalendarClock aria-hidden className="size-4 text-fg-muted" /> Active dates
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts" optional hint="Before this, scanners see “not active yet”.">
              {(control) => (
                <TextInput
                  {...control}
                  type="datetime-local"
                  disabled={!canEdit}
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                />
              )}
            </Field>
            <Field label="Ends" optional hint="After this, scanners see “expired”.">
              {(control) => (
                <TextInput
                  {...control}
                  type="datetime-local"
                  disabled={!canEdit}
                  value={until}
                  onChange={(event) => setUntil(event.target.value)}
                />
              )}
            </Field>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              variant="outline"
              disabled={!canEdit || busy !== null || !datesChanged}
            >
              {busy === "dates" ? "Saving…" : "Save dates"}
            </Button>
            {(code.active_from || code.active_until) && (
              <Button
                variant="ghost"
                disabled={!canEdit || busy !== null}
                onClick={() => {
                  setFrom("");
                  setUntil("");
                }}
              >
                Clear
              </Button>
            )}
          </div>
          <p className="text-sm text-fg-muted">Times are in your time zone.</p>
        </form>
      </div>
    </Card>
  );
}
