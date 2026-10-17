"use client";

import { LIMITS, type AppPage } from "@/lib/pages/types";

import { AreaField, ImagesField, MediaField, rowName, TextField, ToggleField } from "../fields";
import { FormCard } from "../FormCard";
import { SortableList } from "../sortable/SortableList";
import type { EditorProps } from "./shared";

export function AppEditor({ page, set, errors }: EditorProps<AppPage>) {
  return (
    <>
      <FormCard title="Header" note="At the top of your page">
        <MediaField
          label="App icon"
          kind="image"
          maxSide={512}
          value={page.icon}
          onChange={(icon) => set({ icon })}
        />
        <TextField
          label="App name"
          value={page.name}
          onChange={(name) => set({ name })}
          path="name"
          errors={errors}
        />
        <AreaField
          path="description"
          errors={errors}
          label="Description"
          value={page.description}
          onChange={(description) => set({ description })}
        />
      </FormCard>
      <FormCard title="Store links">
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
        />
        <ToggleField
          label="Send phones straight to their store"
          description="iPhones and iPads go to the App Store, Android phones to Google Play. Computers, and phones without their store’s link, see this page."
          checked={page.storeRedirect}
          onChange={(storeRedirect) => set({ storeRedirect })}
        />
      </FormCard>
      <FormCard title="Screenshots" note="Tall phone screenshots, shown as a row to swipe">
        <ImagesField
          value={page.screenshots}
          onChange={(screenshots) => set({ screenshots })}
          onAdd={(media) =>
            set((latest) => ({
              screenshots: [...latest.screenshots, media].slice(0, LIMITS.screenshots),
            }))
          }
          max={LIMITS.screenshots}
          maxSide={1200}
          field="screenshots"
        />
      </FormCard>
      <FormCard title="Features" note="Short points, shown as a checklist">
        <SortableList
          label="Features"
          showLabel={false}
          items={page.features}
          onChange={(features) => set({ features })}
          max={LIMITS.features}
          addLabel="Add feature"
          addAt="end"
          path="features"
          errors={errors}
          itemLabel={(item, i) => rowName("feature", item.text, i)}
          newItem={() => ({ text: "" })}
          render={(item, update, i) => (
            <TextField
              path={`features.${i}.text`}
              errors={errors}
              label="Feature"
              placeholder="Works offline"
              value={item.text}
              onChange={(text) => update({ text })}
            />
          )}
        />
      </FormCard>
      <FormCard title="Website">
        <TextField
          label="Website"
          hideLabel
          optional
          type="url"
          inputMode="url"
          hint="Shown to computers and anyone without a store link."
          value={page.webUrl}
          onChange={(webUrl) => set({ webUrl })}
          path="webUrl"
          errors={errors}
        />
      </FormCard>
    </>
  );
}
