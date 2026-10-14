import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { accessTo, toTeam, type PersonAccess, type TeamPerson } from "@/lib/teams/access";
import type { Database } from "@/types/supabase";

/** Everyone in the signed-in user's team (empty on their own). */
export async function loadTeam(supabase: SupabaseClient<Database>): Promise<TeamPerson[]> {
  const { data } = await supabase.rpc("my_team");
  return toTeam(data ?? []);
}

/** What the signed-in user may do with personId's codes; null when they can't see them. */
export async function personAccess(
  supabase: SupabaseClient<Database>,
  userId: string,
  personId: string,
): Promise<PersonAccess | null> {
  return accessTo(await loadTeam(supabase), userId, personId);
}

/** The codes list for a person: your own, or a teammate's. */
export const codesHref = (ownerId: string, userId: string) =>
  ownerId === userId ? "/codes" : `/codes?workspace=${ownerId}`;
