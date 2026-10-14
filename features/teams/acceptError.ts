/** What to tell someone whose invite couldn't be accepted, from the database's reason. */
export function acceptError(
  message: string,
  names: { currentOwner: string | null; inviter: string | null },
): string {
  if (/already in another team/i.test(message)) {
    const where = names.currentOwner
      ? `You’re in ${names.currentOwner}’s team.`
      : "You’re already in a team.";
    const joining = names.inviter ? `${names.inviter}’s` : "this one";
    return `${where} Leave it before joining ${joining}.`;
  }
  if (/your own team/i.test(message))
    return "You have your own team. Remove its members before joining another.";
  if (/different email/i.test(message)) return "This invite is for a different email address.";
  if (/no longer valid/i.test(message))
    return "This invite has expired or was already used. Ask for a new link.";
  return "The invite couldn’t be accepted. Please try again.";
}
