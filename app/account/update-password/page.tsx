import type { Metadata } from "next";

import { AuthCard } from "@/features/auth/AuthCard";
import { UpdatePasswordForm } from "@/features/auth/UpdatePasswordForm";
import { requireUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Choose a new password · QuickQReate" };

export default async function UpdatePasswordPage() {
  await requireUser("/account/update-password");
  return (
    <AuthCard
      title="Choose a new password"
      description="You're signed in from your reset link. Pick a new password to finish."
    >
      <UpdatePasswordForm redirectTo="/codes" />
    </AuthCard>
  );
}
