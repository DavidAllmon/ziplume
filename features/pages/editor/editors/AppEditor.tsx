"use client";

import { type AppPage } from "@/lib/pages/types";

import { AreaField, MediaField, TextField } from "../fields";
import { Appearance, type EditorProps } from "./shared";

export function AppEditor({ page, set, errors }: EditorProps<AppPage>) {
  return (
    <>
      <TextField
        label="App name"
        value={page.name}
        onChange={(name) => set({ name })}
        path="name"
        errors={errors}
      />
      <AreaField
        label="Description"
        value={page.description}
        onChange={(description) => set({ description })}
      />
      <MediaField
        label="App icon"
        kind="image"
        maxSide={512}
        value={page.icon}
        onChange={(icon) => set({ icon })}
      />
      <TextField
        label="App Store link"
        optional
        type="url"
        inputMode="url"
        value={page.iosUrl}
        onChange={(iosUrl) => set({ iosUrl })}
        path="iosUrl"
        errors={errors}
        placeholder="apps.apple.com/app/…"
        maxLength={2048}
      />
      <TextField
        label="Google Play link"
        optional
        type="url"
        inputMode="url"
        value={page.androidUrl}
        onChange={(androidUrl) => set({ androidUrl })}
        path="androidUrl"
        errors={errors}
        placeholder="play.google.com/store/apps/details?id=…"
        maxLength={2048}
      />
      <TextField
        label="Website"
        optional
        type="url"
        inputMode="url"
        hint="Shown to computers and anyone without a store link."
        value={page.webUrl}
        onChange={(webUrl) => set({ webUrl })}
        path="webUrl"
        errors={errors}
        maxLength={2048}
      />
      <p className="rounded-control bg-surface-2 px-3.5 py-3 text-sm text-fg-muted">
        iPhones go straight to the App Store and Android phones to Google Play. Everyone else sees a
        page with both.
      </p>
      <Appearance color={page.color} set={set} />
    </>
  );
}
