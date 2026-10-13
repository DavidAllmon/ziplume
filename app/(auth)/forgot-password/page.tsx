import type { Metadata } from "next";
import Link from "next/link";

import { AuthCard } from "@/features/auth/AuthCard";
import { ForgotPasswordForm } from "@/features/auth/ForgotPasswordForm";

export const metadata: Metadata = { title: "Reset your password · QuickQReate" };

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      description="Enter your email and we'll send you a link to choose a new password."
      footer={
        <Link href="/login" className="font-semibold text-link underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
