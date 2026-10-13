import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { TeamManager } from "@/features/teams/TeamManager";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Team · QuickQReate" };

export default async function TeamPage() {
  const { supabase, user } = await requireUser("/dashboard/team");
  const [members, invites, workspaces] = await Promise.all([
    supabase.rpc("team_overview"),
    supabase
      .from("team_invites")
      .select("id, email, role, token, created_at, expires_at")
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
    supabase.rpc("my_workspaces"),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-link underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" /> My codes
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-fg">Team</h1>
      </div>
      <TeamManager
        userId={user.id}
        email={user.email ?? ""}
        members={members.data ?? []}
        invites={invites.data ?? []}
        workspaces={workspaces.data ?? []}
      />
    </div>
  );
}
