import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

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
  email: string;
  role: TeamRole;
  valid: boolean;
}

function Problem({ title, message }: { title: string; message: string }) {
  return (
    <AuthCard title={title}>
      <p className="text-fg-muted">{message}</p>
      <Link href="/dashboard" className={`${buttonClasses("outline", "md")} mt-5 w-full`}>
        Go to my codes
      </Link>
    </AuthCard>
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
  if (!user) {
    return (
      <AuthCard
        title="You’re invited to a team"
        description="Sign in, or create a free account, with the email address the invite was sent to."
      >
        <div className="flex flex-col gap-3">
          <Link
            href={`/signup?next=${encodeURIComponent(next)}`}
            className={buttonClasses("primary", "lg")}
          >
            Create free account
          </Link>
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className={buttonClasses("outline", "lg")}
          >
            Sign in
          </Link>
        </div>
      </AuthCard>
    );
  }
  if (needsMfa) redirect(`/login/verify?next=${encodeURIComponent(next)}`);

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
        message="It has expired or was already used. Ask the person who invited you for a new link."
      />
    );
  }
  const owner = invite.owner_name?.trim() || invite.owner_email;
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
    <AuthCard title={`Join ${owner}’s workspace`} description={ROLE_DESCRIPTIONS[invite.role]}>
      <AcceptInviteForm token={token} role={invite.role} />
    </AuthCard>
  );
}
