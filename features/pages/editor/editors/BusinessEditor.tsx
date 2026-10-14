"use client";

import { LIMITS, type BusinessPage } from "@/lib/pages/types";

import {
  AreaField,
  HoursField,
  LinksField,
  MediaField,
  SocialsField,
  TextField,
  ToggleField,
} from "../fields";
import { Appearance, type EditorProps } from "./shared";

export function BusinessEditor({ page, set, errors }: EditorProps<BusinessPage>) {
  return (
    <>
      <TextField
        label="Business name"
        value={page.name}
        onChange={(name) => set({ name })}
        path="name"
        errors={errors}
      />
      <TextField
        label="Tagline"
        optional
        value={page.tagline}
        onChange={(tagline) => set({ tagline })}
        placeholder="Fresh bread, every morning"
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <MediaField
          label="Logo"
          kind="image"
          maxSide={512}
          value={page.logo}
          onChange={(logo) => set({ logo })}
        />
        <MediaField
          label="Cover photo"
          kind="image"
          value={page.cover}
          onChange={(cover) => set({ cover })}
        />
      </div>
      <AreaField
        label="About"
        value={page.about}
        onChange={(about) => set({ about })}
        maxLength={2000}
        rows={4}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Phone"
          optional
          type="tel"
          inputMode="tel"
          value={page.phone}
          onChange={(phone) => set({ phone })}
          path="phone"
          errors={errors}
          maxLength={40}
        />
        <TextField
          label="Email"
          optional
          type="email"
          inputMode="email"
          value={page.email}
          onChange={(email) => set({ email })}
          path="email"
          errors={errors}
          maxLength={254}
        />
        <TextField
          label="Website"
          optional
          type="url"
          inputMode="url"
          value={page.website}
          onChange={(website) => set({ website })}
          path="website"
          errors={errors}
          maxLength={2048}
        />
        <TextField
          label="Address"
          optional
          value={page.address}
          onChange={(address) => set({ address })}
          maxLength={300}
        />
      </div>
      <ToggleField
        label="Show opening hours"
        checked={page.showHours}
        onChange={(showHours) => set({ showHours })}
      />
      {page.showHours && (
        <HoursField hours={page.hours} onChange={(hours) => set({ hours })} errors={errors} />
      )}
      <LinksField
        label="Buttons"
        prefix="buttons"
        items={page.buttons}
        onChange={(buttons) => set({ buttons })}
        max={LIMITS.buttons}
        errors={errors}
      />
      <SocialsField
        items={page.socials}
        onChange={(socials) => set({ socials })}
        max={LIMITS.socials}
        errors={errors}
      />
      <Appearance color={page.color} set={set} />
    </>
  );
}
