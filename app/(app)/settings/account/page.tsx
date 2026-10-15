import type { Metadata } from "next";

import { SettingsSection } from "@/components/app/SettingsSection";
import { DeleteAccountForm } from "@/features/auth/DeleteAccountForm";
import { requireUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Account · Settings" };

export default async function AccountSettingsPage() {
  await requireUser("/settings/account");
  return (
    <SettingsSection
      title="Delete account"
      description="Deletes your codes, scans, pages and photos for good. Printed trackable codes stop working."
      danger
    >
      <DeleteAccountForm />
    </SettingsSection>
  );
}
