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

/** A short name for small labels: the first word of a name, or the email's name part. */
export const firstName = (person: Pick<TeamPerson, "name" | "email">) =>
  person.name?.trim().split(/\s+/)[0] || person.email.split("@")[0]!;

/** Whose codes /codes shows (teams spec 5). */
export type CodesScope =
  | { kind: "self" }
  | { kind: "person"; person: TeamPerson; canEdit: boolean }
  | { kind: "everyone"; canEditOthers: boolean };

/**
 * Reads ?workspace= and ?view=everyone. Someone you can't see, or Everyone while you're on your
 * own, shows your own codes, so old links and bookmarks always land somewhere.
 */
export function codesScope(
  team: TeamPerson[],
  meId: string,
  { workspace, view }: { workspace: string | null; view: string | null },
): CodesScope {
  const me = team.find((person) => person.isMe);
  if (!me) return { kind: "self" };
  if (view === "everyone") return { kind: "everyone", canEditOthers: me.role !== "viewer" };
  const access = workspace ? accessTo(team, meId, workspace) : null;
  return access?.person
    ? { kind: "person", person: access.person, canEdit: access.canEdit }
    : { kind: "self" };
}
