import type { Metadata } from "next";

import { WorkspaceAnalytics } from "@/features/analytics/WorkspaceAnalytics";
import { requireUser } from "@/lib/auth/server";
import { codesScope, personLabel } from "@/lib/teams/access";
import { loadTeam } from "@/lib/teams/server";

export const metadata: Metadata = { title: "Analytics" };

/** Scans across a workspace's codes, scoped like the codes list (spec 4.4). */
export default async function AnalyticsRoute({ searchParams }: PageProps<"/analytics">) {
  const params = await searchParams;
  const requested = typeof params.workspace === "string" ? params.workspace : null;
  const view = typeof params.view === "string" ? params.view : null;
  const { supabase, user } = await requireUser(
    requested
      ? `/analytics?workspace=${requested}`
      : view === "everyone"
        ? "/analytics?view=everyone"
        : "/analytics",
  );
  const team = await loadTeam(supabase);
  const scope = codesScope(team, user.id, { workspace: requested, view });
  const owner =
    scope.kind === "everyone" ? null : scope.kind === "person" ? scope.person.userId : user.id;

  // The first trackable code anyone here can see starts "All time".
  let first = supabase
    .from("qr_codes")
    .select("created_at")
    .eq("is_dynamic", true)
    .order("created_at", { ascending: true })
    .limit(1);
  if (owner) first = first.eq("user_id", owner);
  const { data: firstCode } = await first.maybeSingle();

  const description =
    scope.kind === "everyone"
      ? "Scans across every code you can see."
      : scope.kind === "person"
        ? `Scans across ${personLabel(scope.person)}’s codes.`
        : "Scans across all your codes.";
  return (
    <WorkspaceAnalytics
      owner={owner}
      meId={user.id}
      title="Analytics"
      description={description}
      since={firstCode?.created_at ?? new Date().toISOString()}
      hasCodes={Boolean(firstCode)}
    />
  );
}
