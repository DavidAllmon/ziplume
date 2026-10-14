import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Avatar } from "@/components/ui/Avatar";
import { buttonClasses } from "@/components/ui/Button";
import { AuthCard } from "@/features/auth/AuthCard";
import { AcceptInviteForm } from "@/features/teams/AcceptInviteForm";
import { ROLE_DESCRIPTIONS } from "@/features/teams/roles";
import { getAuthState } from "@/lib/auth/server";
import type { TeamRole } from "@/types/supabase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Team invite · QuickQReate", robots: { index: false } };

interface InviteDetails {
  owner_email: string;
  owner_name: string | null;
  owner_avatar_url: string | null;
  email: string;
  role: TeamRole;
  valid: boolean;
}

function Problem({ title, message }: { title: string; message: string }) {
  return (
    <AuthCard title={title}>
      <p className="text-fg-muted">{message}</p>
      <Link href="/codes" className={`${buttonClasses("outline", "md")} mt-5 w-full`}>
        Go to my codes
      </Link>
    </AuthCard>
  );
}

/** Who sent the invite, with their photo, and which address it is for. */
function Inviter({ invite, owner }: { invite: InviteDetails; owner: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <Avatar
        id={invite.owner_email}
        name={invite.owner_name}
        email={invite.owner_email}
        src={invite.owner_avatar_url}
      />
      <p className="min-w-0 text-sm text-fg-muted">
        <strong className="text-fg">{owner}</strong> invited{" "}
        <strong className="break-all text-fg">{invite.email}</strong>
      </p>
    </div>
  );
}

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const next = `/invite/${token}`;
  if (!/^[0-9a-f]{48}$/.test(token)) {
    return (
      <Problem title="This invite link isn’t valid" message="Check that you copied all of it." />
    );
  }

  const { supabase, user, needsMfa } = await getAuthState();
  if (user && needsMfa) redirect(`/login/verify?next=${encodeURIComponent(next)}`);

  const { data } = await supabase.rpc("invite_details", { p_token: token });
  const invite = data as InviteDetails | null;
  if (!invite) {
    return (
      <Problem title="This invite link isn’t valid" message="Check that you copied all of it." />
    );
  }
  if (!invite.valid) {
    return (
      <Problem
        title="This invite has ended"
        message="It has expired or was already used. Ask the person who invited you for a new one."
      />
    );
  }
  const owner = invite.owner_name?.trim() || invite.owner_email;

  if (!user) {
    return (
      <AuthCard
        title={`${owner} invited you to their QuickQReate codes`}
        description={ROLE_DESCRIPTIONS[invite.role]}
      >
        <Inviter invite={invite} owner={owner} />
        <div className="flex flex-col gap-3">
          <Link
            href={`/signup?invite=${token}&next=${encodeURIComponent(next)}`}
            className={buttonClasses("primary", "lg")}
          >
            Create free account
          </Link>
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className={buttonClasses("outline", "lg")}
          >
            I already have an account
          </Link>
        </div>
        <p className="mt-4 text-sm text-fg-muted">Use {invite.email} so the invite finds you.</p>
      </AuthCard>
    );
  }

  if (invite.email.toLowerCase() !== user.email?.toLowerCase()) {
    return (
      <AuthCard title="This invite is for someone else">
        <div className="flex flex-col gap-4 text-fg-muted">
          <p>
            {owner} invited <strong className="text-fg">{invite.email}</strong>, but you’re signed
            in as <strong className="text-fg">{user.email}</strong>.
          </p>
          <p>Sign out, then sign in or create an account with the invited address.</p>
          <form action="/auth/signout" method="post">
            <button type="submit" className={`${buttonClasses("outline", "md")} w-full`}>
              Sign out
            </button>
          </form>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={`Join ${owner}’s codes`} description={ROLE_DESCRIPTIONS[invite.role]}>
      <Inviter invite={invite} owner={owner} />
      <AcceptInviteForm token={token} role={invite.role} />
    </AuthCard>
  );
}
