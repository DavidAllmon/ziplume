import { Users } from "lucide-react";
import Link from "next/link";

import { Avatar } from "@/components/ui/Avatar";
import { firstName, type TeamPerson } from "@/lib/teams/access";

/**
 * Whose codes to show: you, each teammate, or everyone (teams spec 5). Only in a team. On phones
 * it scrolls sideways inside itself, never the page.
 */
export function PeopleSwitch({
  team,
  current,
}: {
  team: TeamPerson[];
  /** "self", "everyone", or the teammate's user id. */
  current: string;
}) {
  const me = team.find((person) => person.isMe);
  if (!me) return null;
  const items = [
    { key: "self", href: "/codes", label: "You", person: me as TeamPerson | null },
    ...team
      .filter((person) => !person.isMe)
      .map((person) => ({
        key: person.userId,
        href: `/codes?workspace=${person.userId}`,
        label: firstName(person),
        person: person as TeamPerson | null,
      })),
    { key: "everyone", href: "/codes?view=everyone", label: "Everyone", person: null },
  ];
  return (
    <nav aria-label="Whose codes" data-people-switch className="max-w-full overflow-x-auto">
      <ul className="flex w-max gap-2 pb-1">
        {items.map((item) => (
          <li key={item.key}>
            <Link
              href={item.href}
              aria-current={current === item.key ? "page" : undefined}
              className="flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface py-1 pr-4 pl-1.5 text-sm font-medium whitespace-nowrap text-fg focus-ring hover:bg-surface-2 aria-[current=page]:border-primary aria-[current=page]:bg-primary-soft"
            >
              {item.person ? (
                <Avatar
                  id={item.person.userId}
                  name={item.person.name}
                  email={item.person.email}
                  src={item.person.avatarUrl}
                  size="sm"
                />
              ) : (
                <span
                  aria-hidden
                  className="grid size-8 place-items-center rounded-full bg-surface-2"
                >
                  <Users className="size-4" />
                </span>
              )}
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
