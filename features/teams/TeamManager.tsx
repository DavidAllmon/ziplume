"use client";

import { Radio, RadioGroup } from "@headlessui/react";
import { Link2, LogOut, MailCheck, Send, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Button, IconButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { Select, Textarea } from "@/components/ui/inputs";
import { useToast } from "@/components/ui/Toast";
import { CopyButton } from "@/features/dashboard/CopyButton";
import { relativePhrase } from "@/features/dashboard/format";
import { SITE_URL } from "@/lib/env";
import { getBrowserSupabase } from "@/lib/supabase/client";
import { personLabel, type TeamPerson } from "@/lib/teams/access";
import type { TeamInviteRow, TeamRole } from "@/types/supabase";

import { removeMember, resendInvite, sendInvites, type InviteOutcome } from "./actions";
import { MAX_INVITES_PER_REQUEST } from "./inviteInput";
import { ROLE_LABELS, roleLabel } from "./roles";

export type Invite = Pick<
  TeamInviteRow,
  "id" | "email" | "role" | "token" | "created_at" | "expires_at" | "last_sent_at" | "send_count"
>;

/** Most emails one invite can get; the database enforces it too. */
const MAX_SENDS_PER_INVITE = 5;

const inviteLink = (token: string) => `${SITE_URL}/invite/${token}`;

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5 sm:p-6">
      <div>
        <h2 className="font-display text-lg font-bold text-fg">{title}</h2>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      {children}
    </section>
  );
}

/** What happened to one address after "Send invites": emailed, or a link to share. */
function OutcomeRow({ outcome }: { outcome: InviteOutcome }) {
  if (outcome.status === "sent") {
    return (
      <li className="flex items-center gap-2 px-4 py-3 text-sm text-fg">
        <MailCheck aria-hidden className="size-4 shrink-0 text-success" />
        <span className="min-w-0 break-words">
          Invite emailed to <strong>{outcome.email}</strong>
        </span>
      </li>
    );
  }
  return (
    <li className="flex flex-col gap-2 px-4 py-3 text-sm">
      <p className="flex items-start gap-2 text-fg">
        <Link2 aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-muted" />
        <span className="min-w-0 break-words">
          {outcome.message
            ? `${outcome.email}: ${outcome.message}`
            : `Send this link to ${outcome.email}. It works once, for that address, for 14 days.`}
        </span>
      </p>
      {outcome.token && (
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 rounded-lg bg-surface px-3 py-2 font-mono text-sm break-all text-fg">
            {inviteLink(outcome.token)}
          </code>
          <CopyButton
            text={inviteLink(outcome.token)}
            label={`Copy invite link for ${outcome.email}`}
          />
        </div>
      )}
    </li>
  );
}

type Pending =
  { kind: "remove"; member: TeamPerson } | { kind: "leave" } | { kind: "revoke"; invite: Invite };

/** "Keep their codes" or "Let them take their codes", for removing someone. */
function RemoveChoice({ keep, onChange }: { keep: boolean; onChange: (keep: boolean) => void }) {
  const options = [
    {
      value: "keep",
      label: "Keep their codes",
      hint: "Their codes and folders move to your account. Printed codes keep working.",
    },
    { value: "take", label: "Let them take their codes", hint: "They keep everything they made." },
  ] as const;
  return (
    <RadioGroup
      value={keep ? "keep" : "take"}
      onChange={(value) => onChange(value === "keep")}
      aria-label="What happens to their codes?"
      className="flex flex-col gap-2"
    >
      {options.map((option) => (
        <Radio
          key={option.value}
          value={option.value}
          className="flex min-h-11 cursor-pointer flex-col gap-0.5 rounded-control border border-border p-3 data-checked:border-primary data-checked:bg-surface-2 data-focus:outline-2 data-focus:outline-offset-2 data-focus:outline-ring"
        >
          <span className="text-sm font-semibold text-fg">{option.label}</span>
          <span className="text-[13px] text-fg-muted">{option.hint}</span>
        </Radio>
      ))}
    </RadioGroup>
  );
}

/** One person in a team list: photo, name and their role (or a control to change it). */
function PersonRow({ person, children }: { person: TeamPerson; children?: ReactNode }) {
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
      <Avatar
        id={person.userId}
        name={person.name}
        email={person.email}
        src={person.avatarUrl}
        size="sm"
      />
      <div className="min-w-0 flex-1 basis-48">
        <p className="truncate font-medium text-fg">
          {personLabel(person)}
          {person.isMe && <span className="font-normal text-fg-muted"> (you)</span>}
        </p>
        <p className="truncate text-sm text-fg-muted">
          {person.name ? `${person.email} · ` : ""}
          {roleLabel(person.role)}
        </p>
      </div>
      {children}
    </li>
  );
}

/** Your team: invite and manage people (as its owner or on your own), or see it and leave it. */
export function TeamManager({
  userId,
  team,
  invites,
  emailEnabled,
}: {
  userId: string;
  team: TeamPerson[];
  invites: Invite[];
  /** This server can email invites (BREVO_API_KEY is set). */
  emailEnabled: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [addresses, setAddresses] = useState("");
  const [role, setRole] = useState<TeamRole>("editor");
  const [error, setError] = useState("");
  const [sending, setSending] = useState<"email" | "link" | null>(null);
  const [outcomes, setOutcomes] = useState<InviteOutcome[]>([]);
  const [resending, setResending] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Pending | null>(null);
  const [keepCodes, setKeepCodes] = useState(true);
  const [working, setWorking] = useState(false);

  const me = team.find((person) => person.isMe) ?? null;
  const owner = team.find((person) => person.role === "owner") ?? null;
  const ownerName = owner ? personLabel(owner) : "";
  const isMember = me !== null && me.role !== "owner";
  const others = team.filter((person) => !person.isMe);

  async function submit(mode: "email" | "link") {
    setSending(mode);
    setError("");
    let result: Awaited<ReturnType<typeof sendInvites>>;
    try {
      result = await sendInvites({ emails: addresses, role, email: mode === "email" });
    } catch {
      setError("The invites couldn’t be sent. Check your connection and try again.");
      return;
    } finally {
      setSending(null);
    }
    if (result.error) {
      setError(result.error);
      return;
    }
    setOutcomes(result.outcomes);
    if (result.outcomes.every((o) => o.status !== "failed")) setAddresses("");
    const sent = result.outcomes.filter((o) => o.status === "sent").length;
    if (sent > 0) toast(sent === 1 ? "Invite sent" : `${sent} invites sent`);
    router.refresh();
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void submit(emailEnabled ? "email" : "link");
  }

  async function resend(invite: Invite) {
    setResending(invite.id);
    let result: Awaited<ReturnType<typeof resendInvite>>;
    try {
      result = await resendInvite(invite.id);
    } catch {
      toast("The invite couldn’t be emailed. Check your connection and try again.", "error");
      return;
    } finally {
      setResending(null);
    }
    const outcome = result.outcomes[0];
    if (result.error || !outcome) {
      toast(result.error ?? "The invite couldn’t be emailed. Please try again.", "error");
      return;
    }
    if (outcome.status === "sent") toast(`Invite emailed to ${invite.email}`);
    else
      toast(outcome.message ?? "The invite couldn’t be emailed. Share the link instead.", "error");
    router.refresh();
  }

  async function changeRole(member: TeamPerson, next: TeamRole) {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from("team_members")
      .update({ role: next })
      .eq("owner_id", userId)
      .eq("member_id", member.userId);
    if (updateError) return toast("The role couldn’t be changed. Please try again.", "error");
    toast(`${personLabel(member)} is now ${next === "editor" ? "an editor" : "a viewer"}`);
    router.refresh();
  }

  async function runConfirmed() {
    if (!confirm) return;
    setWorking(true);
    if (confirm.kind === "remove") {
      let result: Awaited<ReturnType<typeof removeMember>>;
      try {
        result = await removeMember(confirm.member.userId, keepCodes);
      } catch {
        result = { error: "They couldn’t be removed. Check your connection and try again." };
      }
      setWorking(false);
      if (result.error) return toast(result.error, "error");
      const name = personLabel(confirm.member);
      const moved = result.codes ?? 0;
      toast(
        keepCodes && moved
          ? `Removed ${name}. ${moved} ${moved === 1 ? "code" : "codes"} moved to your codes.`
          : `Removed ${name}`,
      );
      if (result.warning) toast(result.warning, "error");
      setConfirm(null);
      router.refresh();
      return;
    }
    const supabase = getBrowserSupabase();
    if (!supabase) return setWorking(false);
    const { error: deleteError } =
      confirm.kind === "leave"
        ? await supabase.from("team_members").delete().eq("member_id", userId)
        : await supabase.from("team_invites").delete().eq("id", confirm.invite.id);
    setWorking(false);
    if (deleteError) return toast("That didn’t work. Please try again.", "error");
    toast(confirm.kind === "leave" ? `You left ${ownerName}’s team` : "Invite revoked");
    if (confirm.kind === "revoke") {
      const token = confirm.invite.token;
      setOutcomes((current) => current.filter((o) => o.token !== token));
    }
    setConfirm(null);
    router.refresh();
  }

  const dialog =
    confirm?.kind === "remove"
      ? {
          title: `Remove ${personLabel(confirm.member)}?`,
          description: "They’ll stop seeing your team’s codes, and you’ll stop seeing theirs.",
          label: "Remove",
        }
      : confirm?.kind === "leave"
        ? {
            title: `Leave ${ownerName}’s team?`,
            description: `You’ll keep your codes. You and ${ownerName}’s team will stop seeing each other’s codes.`,
            label: "Leave",
          }
        : {
            title: "Revoke this invite?",
            description: "The link stops working. You can create a new one any time.",
            label: "Revoke",
          };

  const canSubmit = sending === null && addresses.trim() !== "";

  return (
    <div className="flex flex-col gap-6">
      {isMember ? (
        <Section
          title="Your team"
          description={`You’re in ${ownerName}’s team as ${me!.role === "editor" ? "an editor" : "a viewer"}. ${
            me!.role === "editor"
              ? "You can see and change everyone’s codes."
              : "You can see everyone’s codes and change your own."
          }`}
        >
          <ul className="divide-y divide-border rounded-control border border-border">
            {team.map((person) => (
              <PersonRow key={person.userId} person={person} />
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Button variant="outline" onClick={() => setConfirm({ kind: "leave" })}>
              <LogOut aria-hidden /> Leave team
            </Button>
            <p className="text-sm text-fg-muted">Only the team owner can invite people.</p>
          </div>
        </Section>
      ) : (
        <>
          <Section
            title="Invite people"
            description="Teammates see each other’s codes. Editors can change everyone’s codes; viewers change only their own."
          >
            <form
              onSubmit={onSubmit}
              className="grid gap-3 sm:grid-cols-[1fr_10rem] sm:items-start"
            >
              <Field
                label="Email addresses"
                error={error}
                hint={`Separate addresses with commas or new lines, up to ${MAX_INVITES_PER_REQUEST} at a time.`}
              >
                {(control) => (
                  <Textarea
                    {...control}
                    rows={2}
                    autoComplete="off"
                    placeholder="sam@example.com, lee@example.com"
                    value={addresses}
                    onChange={(e) => setAddresses(e.target.value)}
                  />
                )}
              </Field>
              <Field label="Role">
                {(control) => (
                  <Select
                    {...control}
                    value={role}
                    onChange={(e) => setRole(e.target.value as TeamRole)}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </Select>
                )}
              </Field>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:col-span-2">
                <Button type="submit" disabled={!canSubmit}>
                  {emailEnabled ? <Send aria-hidden /> : <UserPlus aria-hidden />}
                  {sending === "email"
                    ? "Sending…"
                    : sending === "link"
                      ? "Creating…"
                      : emailEnabled
                        ? "Send invites"
                        : "Create invite link"}
                </Button>
                {emailEnabled ? (
                  <p className="text-sm text-fg-muted">
                    They get an email with a button to join.{" "}
                    <button
                      type="button"
                      disabled={!canSubmit}
                      onClick={() => void submit("link")}
                      className="inline-flex min-h-11 items-center font-medium text-link underline-offset-4 hover:underline disabled:opacity-50"
                    >
                      Share a link instead
                    </button>
                  </p>
                ) : (
                  <p className="text-sm text-fg-muted">
                    Email invites aren’t set up on this server, so you’ll get a link to share
                    yourself.
                  </p>
                )}
              </div>
            </form>
            {outcomes.length > 0 && (
              <ul
                aria-live="polite"
                className="flex flex-col divide-y divide-border rounded-control border border-border bg-surface-2"
              >
                {outcomes.map((outcome) => (
                  <OutcomeRow key={outcome.email} outcome={outcome} />
                ))}
              </ul>
            )}
          </Section>

          {invites.length > 0 && (
            <Section title="Pending invites">
              <ul className="divide-y divide-border rounded-control border border-border">
                {invites.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
                  >
                    <Avatar id={item.email} email={item.email} size="sm" />
                    <div className="min-w-0 flex-1 basis-48">
                      <p className="truncate font-medium text-fg">{item.email}</p>
                      <p className="text-sm text-fg-muted">
                        {ROLE_LABELS[item.role]} ·{" "}
                        {item.last_sent_at
                          ? `emailed ${relativePhrase(item.last_sent_at)}`
                          : "not emailed"}{" "}
                        · expires {relativePhrase(item.expires_at)}
                      </p>
                    </div>
                    {emailEnabled && (
                      <Button
                        variant="outline"
                        disabled={resending === item.id || item.send_count >= MAX_SENDS_PER_INVITE}
                        onClick={() => void resend(item)}
                      >
                        <Send aria-hidden />
                        {resending === item.id
                          ? "Sending…"
                          : item.last_sent_at
                            ? "Resend"
                            : "Email invite"}
                      </Button>
                    )}
                    <CopyButton
                      text={inviteLink(item.token)}
                      label={`Copy invite link for ${item.email}`}
                    />
                    <IconButton
                      label={`Revoke invite for ${item.email}`}
                      size="icon-sm"
                      onClick={() => setConfirm({ kind: "revoke", invite: item })}
                    >
                      <Trash2 aria-hidden />
                    </IconButton>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          <Section
            title="Your team"
            description={
              others.length
                ? "People you’ve invited. You see each other’s codes."
                : "Nobody else is on your team yet."
            }
          >
            {others.length > 0 && (
              <ul className="divide-y divide-border rounded-control border border-border">
                {others.map((member) => (
                  <PersonRow key={member.userId} person={member}>
                    <label className="w-32">
                      <span className="sr-only">Role for {personLabel(member)}</span>
                      <Select
                        value={member.role}
                        onChange={(e) => changeRole(member, e.target.value as TeamRole)}
                      >
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer</option>
                      </Select>
                    </label>
                    <IconButton
                      label={`Remove ${personLabel(member)}`}
                      size="icon-sm"
                      onClick={() => {
                        setKeepCodes(true);
                        setConfirm({ kind: "remove", member });
                      }}
                    >
                      <Trash2 aria-hidden />
                    </IconButton>
                  </PersonRow>
                ))}
              </ul>
            )}
          </Section>
        </>
      )}

      <ConfirmDialog
        open={confirm !== null}
        title={dialog.title}
        description={dialog.description}
        confirmLabel={dialog.label}
        danger
        pending={working}
        onConfirm={runConfirmed}
        onClose={() => setConfirm(null)}
      >
        {confirm?.kind === "remove" && <RemoveChoice keep={keepCodes} onChange={setKeepCodes} />}
      </ConfirmDialog>
    </div>
  );
}
