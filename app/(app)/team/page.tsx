import type { Metadata } from "next";

import { PageHeader } from "@/components/app/PageHeader";
import { TeamManager } from "@/features/teams/TeamManager";
import { requireUser } from "@/lib/auth/server";
import { emailConfigured } from "@/lib/email/brevo";
import { loadTeam } from "@/lib/teams/server";

export const metadata: Metadata = { title: "Team · QuickQReate" };

export default async function TeamPage() {
  const { supabase, user } = await requireUser("/team");
  const [team, invites] = await Promise.all([
    loadTeam(supabase),
    supabase
      .from("team_invites")
      .select("id, email, role, token, created_at, expires_at, last_sent_at, send_count")
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeader
        title="Team"
        description="Teammates see each other’s codes. Choose who can change them."
      />
      <TeamManager
        userId={user.id}
        team={team}
        invites={invites.data ?? []}
        emailEnabled={emailConfigured()}
      />
    </div>
  );
}
