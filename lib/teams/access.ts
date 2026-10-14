import type { Database, TeamRole } from "@/types/supabase";

type MyTeamRow = Database["public"]["Functions"]["my_team"]["Returns"][number];

/** Someone in the signed-in person's team, as my_team() lists them. */
export interface TeamPerson {
  userId: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: "owner" | TeamRole;
  isMe: boolean;
}

export const toTeam = (rows: MyTeamRow[]): TeamPerson[] =>
  rows.map((row) => ({
    userId: row.user_id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatar_url,
    role: row.role,
    isMe: row.is_me,
  }));

/** A person's name, or their email when they haven't set one. */
export const personLabel = (person: Pick<TeamPerson, "name" | "email">) =>
  person.name?.trim() || person.email;

/** What the signed-in person may do with someone's codes. */
export interface PersonAccess {
  /** The codes are the signed-in person's own. */
  self: boolean;
  /** They may change these codes: always for your own; for a teammate's, owners and editors. */
  canEdit: boolean;
  /** The teammate, for someone else's codes; null for your own. */
  person: TeamPerson | null;
}

/** What the signed-in person may do with personId's codes; null when they can't see them. */
export function accessTo(team: TeamPerson[], meId: string, personId: string): PersonAccess | null {
  if (personId === meId) return { self: true, canEdit: true, person: null };
  const me = team.find((p) => p.isMe);
  const person = team.find((p) => p.userId === personId && !p.isMe);
  if (!me || !person) return null;
  return { self: false, canEdit: me.role !== "viewer", person };
}
