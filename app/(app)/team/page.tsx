import type { Metadata } from "next";

import { PageHeader } from "@/components/app/PageHeader";
import { TeamManager } from "@/features/teams/TeamManager";
import { requireUser } from "@/lib/auth/server";
import { emailConfigured } from "@/lib/email/brevo";

export const metadata: Metadata = { title: "Team · QuickQReate" };

export default async function TeamPage() {
  const { supabase, user } = await requireUser("/team");
  const [members, invites, workspaces] = await Promise.all([
    supabase.rpc("team_overview"),
    supabase
      .from("team_invites")
      .select("id, email, role, token, created_at, expires_at, last_sent_at, send_count")
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
    supabase.rpc("my_workspaces"),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Team"
        description="Invite people to your codes and choose who can change them."
      />
      <TeamManager
        userId={user.id}
        members={members.data ?? []}
        invites={invites.data ?? []}
        workspaces={workspaces.data ?? []}
        emailEnabled={emailConfigured()}
      />
    </div>
  );
}
