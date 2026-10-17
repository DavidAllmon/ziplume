"use client";

import { LIMITS, type BusinessPage } from "@/lib/pages/types";

import {
  AreaField,
  HoursField,
  ImagesField,
  LinksField,
  MediaField,
  rowName,
  SocialsField,
  TextField,
  TimeZoneField,
  ToggleField,
} from "../fields";
import { FormCard } from "../FormCard";
import { SortableList } from "../sortable/SortableList";
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
      <FormCard title="Photos" note="A row to swipe through; tapping one shows it full screen">
        <ImagesField
          value={page.gallery}
          onChange={(gallery) => set({ gallery })}
          onAdd={(media) =>
            set((latest) => ({ gallery: [...latest.gallery, media].slice(0, LIMITS.gallery) }))
          }
          max={LIMITS.gallery}
          field="gallery"
        />
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
      <FormCard title="Services" note="Under About, with a price if you like">
        <SortableList
          label="Services"
          showLabel={false}
          items={page.services}
          onChange={(services) => set({ services })}
          max={LIMITS.services}
          addLabel="Add service"
          addAt="end"
          newRowFocus="input[data-field$='.name']"
          path="services"
          errors={errors}
          itemLabel={(item, i) => rowName("service", item.name, i)}
          newItem={() => ({ name: "", price: "", description: "" })}
          render={(item, update, i) => (
            <div className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                <TextField
                  path={`services.${i}.name`}
                  errors={errors}
                  label="Service"
                  placeholder="Cake order"
                  value={item.name}
                  onChange={(name) => update({ name })}
                />
                <TextField
                  path={`services.${i}.price`}
                  errors={errors}
                  label="Price"
                  optional
                  placeholder="$40"
                  value={item.price}
                  onChange={(price) => update({ price })}
                />
              </div>
              <TextField
                path={`services.${i}.description`}
                errors={errors}
                label="Description"
                optional
                value={item.description}
                onChange={(description) => update({ description })}
              />
            </div>
          )}
        />
      </FormCard>
      <FormCard title="Opening hours">
        <ToggleField
          label="Show opening hours"
          checked={page.showHours}
          onChange={(showHours) => set({ showHours })}
        />
        {page.showHours && (
          <>
            <TimeZoneField
              value={page.timeZone}
              onChange={(timeZone) => set({ timeZone })}
              error={errors.error("timeZone")}
              hint="For Open now. If it's not set, each visitor's own time is used."
            />
            <HoursField hours={page.hours} onChange={(hours) => set({ hours })} errors={errors} />
            <SortableList
              label="Closures"
              items={page.closures}
              onChange={(closures) => set({ closures })}
              max={LIMITS.closures}
              addLabel="Add closure"
              addAt="end"
              newRowFocus="input[type='date']"
              path="closures"
              errors={errors}
              itemLabel={(item, i) => rowName("closure", item.note || item.date, i)}
              newItem={() => ({ date: "", note: "" })}
              render={(item, update, i) => (
                <div className="grid gap-3 sm:grid-cols-[11rem_1fr]">
                  <TextField
                    path={`closures.${i}.date`}
                    errors={errors}
                    label="Date"
                    type="date"
                    value={item.date}
                    onChange={(date) => update({ date })}
                  />
                  <TextField
                    path={`closures.${i}.note`}
                    errors={errors}
                    label="Note"
                    optional
                    placeholder="Thanksgiving"
                    value={item.note}
                    onChange={(note) => update({ note })}
                  />
                </div>
              )}
            />
          </>
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
          presets
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
