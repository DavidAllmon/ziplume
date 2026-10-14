import type { Metadata } from "next";

import { SettingsSection } from "@/components/app/SettingsSection";
import { TotpSettings } from "@/features/auth/TotpSettings";
import { UpdatePasswordForm } from "@/features/auth/UpdatePasswordForm";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Security · Settings · QuickQReate" };

export default async function SecuritySettingsPage() {
  const { user } = await requireUser("/settings/security");
  const usesPassword = user.identities?.some((identity) => identity.provider === "email") ?? false;
  return (
    <>
      <SettingsSection
        title="Password"
        description={
          usesPassword
            ? "Change the password you sign in with."
            : "You sign in with Google. Add a password to also sign in with your email."
        }
      >
        <UpdatePasswordForm />
      </SettingsSection>
      <SettingsSection
        title="Two-step verification"
        description="Optional, and free like everything else."
      >
        <TotpSettings />
      </SettingsSection>
    </>
  );
}
