export const MAX_INVITES_PER_REQUEST = 10;
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export type ParsedInvites = { ok: true; emails: string[] } | { ok: false; error: string };

/**
 * Reads the invite box: addresses separated by commas, semicolons, spaces or new lines. Repeats
 * are dropped (ignoring case), and everything is checked before anything is saved.
 */
export function parseInviteEmails(
  raw: string,
  { self, members = [] }: { self: string; members?: string[] },
): ParsedInvites {
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const part of raw.split(/[\s,;]+/)) {
    const email = part.trim();
    if (!email || seen.has(email.toLowerCase())) continue;
    seen.add(email.toLowerCase());
    emails.push(email);
  }
  if (emails.length === 0) return { ok: false, error: "Enter at least one email address." };
  const invalid = emails.find((email) => email.length > 254 || !EMAIL.test(email));
  if (invalid) return { ok: false, error: `“${invalid}” isn’t an email address.` };
  if (emails.length > MAX_INVITES_PER_REQUEST) {
    return { ok: false, error: `Invite up to ${MAX_INVITES_PER_REQUEST} people at a time.` };
  }
  if (emails.some((email) => email.toLowerCase() === self.toLowerCase())) {
    return { ok: false, error: "That’s your own address. Invite someone else." };
  }
  const member = emails.find((email) =>
    members.some((m) => m.toLowerCase() === email.toLowerCase()),
  );
  if (member) {
    return {
      ok: false,
      error: `${member} is already on your team. Change their role below instead.`,
    };
  }
  return { ok: true, emails };
}
