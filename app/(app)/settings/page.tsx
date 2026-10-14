import type { Metadata } from "next";

import { SettingsSection } from "@/components/app/SettingsSection";
import { ProfileForm } from "@/features/auth/ProfileForm";
import { googlePhotoOf } from "@/features/profile/googlePhoto";
import { requireUser } from "@/lib/auth/server";

import { HashRedirect } from "./HashRedirect";

export const metadata: Metadata = { title: "Profile · Settings · QuickQReate" };

export default async function ProfileSettingsPage() {
  const { supabase, user } = await requireUser("/settings");
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  return (
    <>
      <HashRedirect />
      <SettingsSection
        title="Profile"
        description="Your photo and name show to your team and in invites you send."
      >
        <ProfileForm
          userId={user.id}
          email={user.email ?? ""}
          initialName={profile?.display_name ?? ""}
          avatarUrl={profile?.avatar_url ?? null}
          googlePhoto={googlePhotoOf(user)}
        />
      </SettingsSection>
    </>
  );
}
