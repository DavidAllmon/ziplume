import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/features/auth/AuthCard";
import { safeNext } from "@/features/auth/redirects";
import { SignupForm } from "@/features/auth/SignupForm";
import { getServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Create your account" };

/** The unused invite a sign-up link carries (/signup?invite=<token>), checked on the server. */
async function inviteFor(token: unknown) {
  if (typeof token !== "string" || !/^[0-9a-f]{48}$/.test(token)) return null;
  const supabase = await getServerSupabase();
  const { data } = await supabase.rpc("invite_details", { p_token: token });
  const details = data as {
    email: string;
    valid: boolean;
    owner_name: string | null;
    owner_email: string;
  } | null;
  if (!details?.valid) return null;
  return { token, email: details.email, owner: details.owner_name?.trim() || details.owner_email };
}

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const params = await searchParams;
  const invite = await inviteFor(params.invite);
  const next = safeNext(
    typeof params.next === "string" ? params.next : null,
    invite ? `/invite/${invite.token}` : undefined,
  );
  return (
    <AuthCard
      title="Create your free account"
      description={
        invite
          ? `Create your account with ${invite.email} to join ${invite.owner}’s codes.`
          : "Editable codes, scan analytics and unlimited saved designs. Free, with no limits."
      }
      footer={
        <>
          Already have an account?{" "}
          <Link
            href={`/login?next=${encodeURIComponent(next)}`}
            className="font-semibold text-link underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </>
      }
    >
      <SignupForm
        next={next}
        invite={invite ? { token: invite.token, email: invite.email } : undefined}
      />
    </AuthCard>
  );
}
