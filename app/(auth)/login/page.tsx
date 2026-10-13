import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/features/auth/AuthCard";
import { LoginForm } from "@/features/auth/LoginForm";
import { safeNext } from "@/features/auth/redirects";

export const metadata: Metadata = { title: "Sign in · QuickQReate" };

const ERRORS: Record<string, string> = {
  link: "That link has expired or was already used. Sign in, or request a new one.",
  oauth: "Google sign-in didn't finish. Please try again.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === "string" ? params.next : null);
  const error = typeof params.error === "string" ? ERRORS[params.error] : undefined;
  return (
    <AuthCard
      title="Sign in to QuickQReate"
      description="Manage your codes, edit where they point and see who scans them."
      footer={
        <>
          New here?{" "}
          <Link
            href={`/signup?next=${encodeURIComponent(next)}`}
            className="font-semibold text-link underline-offset-4 hover:underline"
          >
            Create a free account
          </Link>
        </>
      }
    >
      <LoginForm next={next} initialError={error} />
    </AuthCard>
  );
}
