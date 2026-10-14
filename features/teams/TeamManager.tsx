"use client";

import { ArrowRight, Link2, LogOut, MailCheck, Send, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { Avatar } from "@/components/ui/Avatar";
import { Button, buttonClasses, IconButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { Select, Textarea } from "@/components/ui/inputs";
import { useToast } from "@/components/ui/Toast";
import { CopyButton } from "@/features/dashboard/CopyButton";
import { relativePhrase } from "@/features/dashboard/format";
import { SITE_URL } from "@/lib/env";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { TeamInviteRow, TeamRole } from "@/types/supabase";

import { resendInvite, sendInvites, type InviteOutcome } from "./actions";
import { MAX_INVITES_PER_REQUEST } from "./inviteInput";
import { ROLE_LABELS, workspaceLabel } from "./roles";

export interface Member {
  member_id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  role: TeamRole;
  created_at: string;
}

export interface Membership {
  owner_id: string;
  owner_email: string;
  owner_name: string | null;
  owner_avatar_url: string | null;
  role: TeamRole;
}

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
  | { kind: "remove"; member: Member }
  | { kind: "leave"; workspace: Membership }
  | { kind: "revoke"; invite: Invite };

/** Invite people to your codes, manage their roles, and see the teams you're in. */
export function TeamManager({
  userId,
  members,
  invites,
  workspaces,
  emailEnabled,
}: {
  userId: string;
  members: Member[];
  invites: Invite[];
  workspaces: Membership[];
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
  const [working, setWorking] = useState(false);

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

  async function changeRole(member: Member, next: TeamRole) {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const { error: updateError } = await supabase
      .from("team_members")
      .update({ role: next })
      .eq("owner_id", userId)
      .eq("member_id", member.member_id);
    if (updateError) return toast("The role couldn’t be changed. Please try again.", "error");
    toast(`${member.name || member.email} is now ${next === "editor" ? "an editor" : "a viewer"}`);
    router.refresh();
  }

  async function runConfirmed() {
    const supabase = getBrowserSupabase();
    if (!supabase || !confirm) return;
    setWorking(true);
    const { error: deleteError } =
      confirm.kind === "remove"
        ? await supabase
            .from("team_members")
            .delete()
            .eq("owner_id", userId)
            .eq("member_id", confirm.member.member_id)
        : confirm.kind === "leave"
          ? await supabase
              .from("team_members")
              .delete()
              .eq("owner_id", confirm.workspace.owner_id)
              .eq("member_id", userId)
          : await supabase.from("team_invites").delete().eq("id", confirm.invite.id);
    setWorking(false);
    if (deleteError) return toast("That didn’t work. Please try again.", "error");
    toast(
      confirm.kind === "remove"
        ? "Removed from your team"
        : confirm.kind === "leave"
          ? `You left ${workspaceLabel(confirm.workspace)}’s team`
          : "Invite revoked",
    );
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
          title: `Remove ${confirm.member.name || confirm.member.email}?`,
          description:
            "They lose access to your codes straight away. You can invite them again later.",
          label: "Remove",
        }
      : confirm?.kind === "leave"
        ? {
            title: `Leave ${workspaceLabel(confirm.workspace)}’s team?`,
            description: "You’ll need a new invite to get back in.",
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
      <Section
        title="Invite people"
        description="Viewers see your codes, analytics and feedback. Editors can also create, change and delete codes and folders."
      >
        <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-[1fr_10rem] sm:items-start">
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
                Email invites aren’t set up on this server, so you’ll get a link to share yourself.
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
              <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
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
          members.length
            ? "People who can open your codes."
            : "Nobody else has access to your codes yet."
        }
      >
        {members.length > 0 && (
          <ul className="divide-y divide-border rounded-control border border-border">
            {members.map((member) => (
              <li
                key={member.member_id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
              >
                <Avatar
                  id={member.member_id}
                  name={member.name}
                  email={member.email}
                  src={member.avatar_url}
                  size="sm"
                />
                <div className="min-w-0 flex-1 basis-48">
                  <p className="truncate font-medium text-fg">{member.name || member.email}</p>
                  <p className="truncate text-sm text-fg-muted">
                    {member.name ? `${member.email} · ` : ""}joined{" "}
                    {relativePhrase(member.created_at)}
                  </p>
                </div>
                <label className="w-32">
                  <span className="sr-only">Role for {member.name || member.email}</span>
                  <Select
                    value={member.role}
                    onChange={(e) => changeRole(member, e.target.value as TeamRole)}
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </Select>
                </label>
                <IconButton
                  label={`Remove ${member.name || member.email}`}
                  size="icon-sm"
                  onClick={() => setConfirm({ kind: "remove", member })}
                >
                  <Trash2 aria-hidden />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {workspaces.length > 0 && (
        <Section title="Teams you’re in" description="Codes other people have shared with you.">
          <ul className="divide-y divide-border rounded-control border border-border">
            {workspaces.map((workspace) => (
              <li
                key={workspace.owner_id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
              >
                <Avatar
                  id={workspace.owner_id}
                  name={workspace.owner_name}
                  email={workspace.owner_email}
                  src={workspace.owner_avatar_url}
                  size="sm"
                />
                <div className="min-w-0 flex-1 basis-48">
                  <p className="truncate font-medium text-fg">{workspaceLabel(workspace)}</p>
                  <p className="text-sm text-fg-muted">{ROLE_LABELS[workspace.role]}</p>
                </div>
                <Link
                  href={`/dashboard?workspace=${workspace.owner_id}`}
                  className={buttonClasses("outline", "sm")}
                >
                  Open <ArrowRight aria-hidden />
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirm({ kind: "leave", workspace })}
                >
                  <LogOut aria-hidden /> Leave
                </Button>
              </li>
            ))}
          </ul>
        </Section>
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
      />
    </div>
  );
}
