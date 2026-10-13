"use client";

import { ArrowRight, LogOut, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";

import { Button, buttonClasses, IconButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { Select, TextInput } from "@/components/ui/inputs";
import { useToast } from "@/components/ui/Toast";
import { CopyButton } from "@/features/dashboard/CopyButton";
import { relativePhrase } from "@/features/dashboard/format";
import { SITE_URL } from "@/lib/env";
import { getBrowserSupabase } from "@/lib/supabase/client";
import type { TeamInviteRow, TeamRole } from "@/types/supabase";

import { ROLE_LABELS, workspaceLabel } from "./roles";

export interface Member {
  member_id: string;
  email: string;
  name: string | null;
  role: TeamRole;
  created_at: string;
}

export interface Membership {
  owner_id: string;
  owner_email: string;
  owner_name: string | null;
  role: TeamRole;
}

type Invite = Pick<TeamInviteRow, "id" | "email" | "role" | "token" | "created_at" | "expires_at">;

const inviteLink = (token: string) => `${SITE_URL}/invite/${token}`;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

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

type Pending =
  | { kind: "remove"; member: Member }
  | { kind: "leave"; workspace: Membership }
  | { kind: "revoke"; invite: Invite };

/** Invite people to your workspace, manage their roles, and see the teams you're in. */
export function TeamManager({
  userId,
  email,
  members,
  invites,
  workspaces,
}: {
  userId: string;
  email: string;
  members: Member[];
  invites: Invite[];
  workspaces: Membership[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [inviteEmail, setInviteEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("editor");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [created, setCreated] = useState<Invite | null>(null);
  const [confirm, setConfirm] = useState<Pending | null>(null);
  const [working, setWorking] = useState(false);

  async function invite(event: FormEvent) {
    event.preventDefault();
    const address = inviteEmail.trim();
    if (!EMAIL.test(address)) return setError("Enter an email address, like sam@example.com.");
    if (address.toLowerCase() === email.toLowerCase())
      return setError("That’s your own address. Invite someone else.");
    if (members.some((m) => m.email.toLowerCase() === address.toLowerCase()))
      return setError("They’re already on your team. Change their role below instead.");
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    setSending(true);
    setError("");
    const { data, error: insertError } = await supabase
      .from("team_invites")
      .insert({ email: address, role })
      .select("id, email, role, token, created_at, expires_at")
      .single();
    setSending(false);
    if (insertError || !data) return setError("The invite couldn’t be created. Please try again.");
    setCreated(data);
    setInviteEmail("");
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
          ? `You left ${workspaceLabel(confirm.workspace)}’s workspace`
          : "Invite revoked",
    );
    if (confirm.kind === "revoke" && created?.id === confirm.invite.id) setCreated(null);
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
            title: `Leave ${workspaceLabel(confirm.workspace)}’s workspace?`,
            description: "You’ll need a new invite to get back in.",
            label: "Leave",
          }
        : {
            title: "Revoke this invite?",
            description: "The link stops working. You can create a new one any time.",
            label: "Revoke",
          };

  return (
    <div className="flex flex-col gap-6">
      <Section
        title="Invite people"
        description="Share your codes with coworkers. Viewers see codes, analytics and feedback; editors can also create, change and delete codes and folders."
      >
        {created && (
          <div className="flex flex-col gap-2 rounded-control border border-primary/40 bg-primary-soft p-4">
            <p className="text-sm font-semibold text-fg">
              Send this link to {created.email}. It works once, for that address, for 14 days.
            </p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 rounded-lg bg-surface px-3 py-2 font-mono text-sm break-all text-fg">
                {inviteLink(created.token)}
              </code>
              <CopyButton text={inviteLink(created.token)} label="Copy invite link" />
            </div>
          </div>
        )}
        <form onSubmit={invite} className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-start">
          <Field label="Email address" error={error}>
            {(control) => (
              <TextInput
                {...control}
                type="email"
                autoComplete="off"
                placeholder="sam@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
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
          <Button type="submit" disabled={sending} className="sm:mt-7">
            <UserPlus aria-hidden />
            {sending ? "Creating…" : "Create invite link"}
          </Button>
        </form>
        <p className="text-sm text-fg-muted">
          QuickQReate doesn’t email invites for you, so nothing is sent until you share the link.
        </p>
      </Section>

      {invites.length > 0 && (
        <Section title="Pending invites">
          <ul className="divide-y divide-border rounded-control border border-border">
            {invites.map((item) => (
              <li key={item.id} className="flex items-center gap-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-fg">{item.email}</p>
                  <p className="text-sm text-fg-muted">
                    {ROLE_LABELS[item.role]} · expires {relativePhrase(item.expires_at)}
                  </p>
                </div>
                <CopyButton text={inviteLink(item.token)} label="Copy invite link" />
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
            ? "People who can open your workspace."
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
        <Section
          title="Teams you’re in"
          description="Workspaces other people have shared with you."
        >
          <ul className="divide-y divide-border rounded-control border border-border">
            {workspaces.map((workspace) => (
              <li
                key={workspace.owner_id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3"
              >
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
