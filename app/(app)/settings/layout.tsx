import type { ReactNode } from "react";

import { PageHeader } from "@/components/app/PageHeader";

import { SettingsTabs } from "./SettingsTabs";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PageHeader title="Settings" />
      <SettingsTabs />
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}
