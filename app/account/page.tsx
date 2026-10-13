import type { Metadata } from "next";
import type { ReactNode } from "react";

import { BuyMeACoffee } from "@/components/support/BuyMeACoffee";
import { DeleteAccountForm } from "@/features/auth/DeleteAccountForm";
import { ProfileForm } from "@/features/auth/ProfileForm";
import { TotpSettings } from "@/features/auth/TotpSettings";
import { UpdatePasswordForm } from "@/features/auth/UpdatePasswordForm";
import { requireUser } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Account · QuickQReate" };

function Panel({
  title,
  description,
  children,
  danger,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <section
      className={`grid gap-4 rounded-card border bg-surface p-5 sm:p-6 md:grid-cols-[16rem_1fr] md:gap-8 ${danger ? "border-danger/40" : "border-border"}`}
    >
      <div>
        <h2 className={`font-display text-lg font-bold ${danger ? "text-danger" : "text-fg"}`}>
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export default async function AccountPage() {
  const { supabase, user } = await requireUser("/account");
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const usesPassword = user.identities?.some((identity) => identity.provider === "email") ?? false;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h1 className="font-display text-3xl font-bold tracking-tight text-fg">Account</h1>
      <Panel title="Profile">
        <ProfileForm
          userId={user.id}
          email={user.email ?? ""}
          initialName={profile?.display_name ?? ""}
        />
      </Panel>
      <Panel
        title="Password"
        description={
          usesPassword
            ? "Change the password you sign in with."
            : "You sign in with Google. Add a password to also sign in with your email."
        }
      >
        <UpdatePasswordForm />
      </Panel>
      <Panel title="Two-step verification" description="Optional, and free like everything else.">
        <TotpSettings />
      </Panel>
      <BuyMeACoffee variant="card" />
      <Panel title="Delete account" danger>
        <DeleteAccountForm />
      </Panel>
    </div>
  );
}
