import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthCard } from "@/features/auth/AuthCard";
import { MfaChallengeForm } from "@/features/auth/MfaChallengeForm";
import { safeNext } from "@/features/auth/redirects";
import { getServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Two-step verification · QuickQReate" };

export default async function VerifyPage({ searchParams }: PageProps<"/login/verify">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const supabase = await getServerSupabase();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return (
    <AuthCard
      title="Two-step verification"
      description="Your account is protected with an authenticator app."
    >
      <MfaChallengeForm next={next} />
    </AuthCard>
  );
}
