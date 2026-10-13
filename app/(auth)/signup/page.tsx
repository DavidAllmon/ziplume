import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/features/auth/AuthCard";
import { safeNext } from "@/features/auth/redirects";
import { SignupForm } from "@/features/auth/SignupForm";

export const metadata: Metadata = { title: "Create your account · QuickQReate" };

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  return (
    <AuthCard
      title="Create your free account"
      description="Editable codes, scan analytics and unlimited saved designs. Free, with no limits."
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
      <SignupForm next={next} />
    </AuthCard>
  );
}
