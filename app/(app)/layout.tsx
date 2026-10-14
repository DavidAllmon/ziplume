import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/app/AppShell";
import { getAuthState } from "@/lib/auth/server";
import { accountsEnabled } from "@/lib/env";
import { personLabel } from "@/lib/teams/access";
import { loadTeam } from "@/lib/teams/server";

export const dynamic = "force-dynamic";

/** The signed-in app. Each page still checks sign-in itself (and redirects if needed). */
export default async function AppLayout({ children }: { children: ReactNode }) {
  if (!accountsEnabled) notFound();
  const { supabase, user, needsMfa } = await getAuthState();
  // Until two-step verification is done the page redirects; show nothing about the account.
  if (!user || needsMfa) return <>{children}</>;
  const [{ data: profile }, team] = await Promise.all([
    supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle(),
    loadTeam(supabase),
  ]);
  const me = team.find((person) => person.isMe);
  return (
    <AppShell
      user={{
        id: user.id,
        email: user.email ?? "",
        name: profile?.display_name?.trim() || null,
        avatarUrl: profile?.avatar_url ?? null,
      }}
      teams={team
        .filter((person) => !person.isMe)
        .map((person) => ({
          ownerId: person.userId,
          label: personLabel(person),
          role: me?.role === "viewer" ? "viewer" : "editor",
          avatarUrl: person.avatarUrl,
        }))}
    >
      {children}
    </AppShell>
  );
}
