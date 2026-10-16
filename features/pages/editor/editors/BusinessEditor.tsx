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
import { FormCard } from "../FormCard";
import type { EditorProps } from "./shared";

export function BusinessEditor({ page, set, errors }: EditorProps<BusinessPage>) {
  return (
    <>
      <FormCard title="Header" note="At the top of your page">
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
        <TextField
          label="Business name"
          value={page.name}
          onChange={(name) => set({ name })}
          path="name"
          errors={errors}
        />
        <TextField
          path="tagline"
          errors={errors}
          label="Tagline"
          optional
          value={page.tagline}
          onChange={(tagline) => set({ tagline })}
          placeholder="Fresh bread, every morning"
        />
      </FormCard>
      <FormCard title="Contact">
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
          />
          <TextField
            path="address"
            errors={errors}
            label="Address"
            optional
            value={page.address}
            onChange={(address) => set({ address })}
          />
        </div>
      </FormCard>
      <FormCard title="About">
        <AreaField
          path="about"
          errors={errors}
          label="About"
          hideLabel
          value={page.about}
          onChange={(about) => set({ about })}
          rows={4}
        />
      </FormCard>
      <FormCard title="Opening hours">
        <ToggleField
          label="Show opening hours"
          checked={page.showHours}
          onChange={(showHours) => set({ showHours })}
        />
        {page.showHours && (
          <HoursField hours={page.hours} onChange={(hours) => set({ hours })} errors={errors} />
        )}
      </FormCard>
      <FormCard title="Buttons">
        <LinksField
          label="Buttons"
          prefix="buttons"
          itemName="button"
          items={page.buttons}
          onChange={(buttons) => set({ buttons })}
          max={LIMITS.buttons}
          errors={errors}
        />
      </FormCard>
      <FormCard title="Social icons">
        <SocialsField
          items={page.socials}
          onChange={(socials) => set({ socials })}
          max={LIMITS.socials}
          errors={errors}
        />
      </FormCard>
    </>
  );
}
