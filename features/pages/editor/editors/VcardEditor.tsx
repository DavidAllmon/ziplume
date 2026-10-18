"use client";

import { LIMITS, type VcardPage } from "@/lib/pages/types";

import { AreaField, MediaField, rowName, SocialsField, TextField, ToggleField } from "../fields";
import { FormCard } from "../FormCard";
import { SortableList } from "../sortable/SortableList";
import type { EditorProps } from "./shared";

export function VcardEditor({ page, set, errors }: EditorProps<VcardPage>) {
  return (
    <>
      <FormCard title="Header" note="At the top of your page">
        <MediaField
          label="Photo"
          kind="image"
          round
          maxSide={512}
          value={page.photo}
          onChange={(photo) => set({ photo })}
        />
        <MediaField
          label="Cover photo"
          kind="image"
          maxSide={1600}
          hint="A wide photo across the top."
          value={page.cover}
          onChange={(cover) => set({ cover })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="First name"
            value={page.firstName}
            onChange={(firstName) => set({ firstName })}
            path="firstName"
            errors={errors}
            autoComplete="given-name"
          />
          <TextField
            path="lastName"
            errors={errors}
            label="Last name"
            value={page.lastName}
            onChange={(lastName) => set({ lastName })}
            autoComplete="family-name"
          />
          <TextField
            path="pronouns"
            errors={errors}
            label="Pronouns"
            optional
            placeholder="she/her"
            value={page.pronouns}
            onChange={(pronouns) => set({ pronouns })}
          />
          <TextField
            path="jobTitle"
            errors={errors}
            label="Job title"
            optional
            value={page.jobTitle}
            onChange={(jobTitle) => set({ jobTitle })}
          />
          <TextField
            path="company"
            errors={errors}
            label="Company"
            optional
            value={page.company}
            onChange={(company) => set({ company })}
          />
          <TextField
            path="department"
            errors={errors}
            label="Department"
            optional
            value={page.department}
            onChange={(department) => set({ department })}
          />
        </div>
      </FormCard>
      <FormCard title="About">
        <AreaField
          path="bio"
          errors={errors}
          label="About"
          hideLabel
          value={page.bio}
          onChange={(bio) => set({ bio })}
        />
      </FormCard>
      <FormCard title="Phone numbers">
        <SortableList
          label="Phone numbers"
          showLabel={false}
          items={page.phones}
          onChange={(phones) => set({ phones })}
          max={LIMITS.phones}
          addLabel="Add phone"
          addAt="end"
          newRowFocus="input[type='tel']"
          path="phones"
          errors={errors}
          itemLabel={(item, i) => rowName("phone", item.number, i)}
          newItem={() => ({ label: "Mobile", number: "", whatsapp: false })}
          render={(item, update, i) => (
            <div className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
                <TextField
                  path={`phones.${i}.label`}
                  errors={errors}
                  label="Label"
                  value={item.label}
                  onChange={(label) => update({ label })}
                />
                <TextField
                  label="Number"
                  type="tel"
                  inputMode="tel"
                  value={item.number}
                  onChange={(number) => update({ number })}
                  path={`phones.${i}.number`}
                  errors={errors}
                  placeholder="+1 555 010 9999"
                />
              </div>
              <label className="flex min-h-11 items-center gap-2 text-sm text-fg sm:min-h-0">
                <input
                  type="checkbox"
                  className="size-5 accent-primary"
                  checked={item.whatsapp}
                  onChange={(event) => update({ whatsapp: event.target.checked })}
                />
                On WhatsApp
              </label>
            </div>
          )}
        />
      </FormCard>
      <FormCard title="Email addresses">
        <SortableList
          label="Email addresses"
          showLabel={false}
          items={page.emails}
          onChange={(emails) => set({ emails })}
          max={LIMITS.emails}
          addLabel="Add email"
          addAt="end"
          newRowFocus="input[type='email']"
          path="emails"
          errors={errors}
          itemLabel={(item, i) => rowName("email", item.address, i)}
          newItem={() => ({ label: "Work", address: "" })}
          render={(item, update, i) => (
            <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
              <TextField
                path={`emails.${i}.label`}
                errors={errors}
                label="Label"
                value={item.label}
                onChange={(label) => update({ label })}
              />
              <TextField
                label="Email"
                type="email"
                inputMode="email"
                value={item.address}
                onChange={(address) => update({ address })}
                path={`emails.${i}.address`}
                errors={errors}
                placeholder="you@example.com"
              />
            </div>
          )}
        />
      </FormCard>
      <FormCard
        title="Quick buttons"
        note="Under your name, from your first phone, email and address"
      >
        <ToggleField
          label="Call button"
          checked={page.showCall}
          onChange={(showCall) => set({ showCall })}
        />
        <ToggleField
          label="Text button"
          checked={page.showText}
          onChange={(showText) => set({ showText })}
        />
        <ToggleField
          label="Email button"
          checked={page.showEmail}
          onChange={(showEmail) => set({ showEmail })}
        />
        <ToggleField
          label="WhatsApp button"
          description="Uses the first number marked On WhatsApp."
          checked={page.showWhatsapp}
          onChange={(showWhatsapp) => set({ showWhatsapp })}
        />
        <ToggleField
          label="Directions button"
          checked={page.showDirections}
          onChange={(showDirections) => set({ showDirections })}
        />
      </FormCard>
      <FormCard title="Share your details" note="Visitors send you theirs">
        <ToggleField
          label="Share your details button"
          description="Visitors can send you their name with a phone number or email. You’ll find them on this code’s page."
          checked={page.shareDetails}
          onChange={(shareDetails) => set({ shareDetails })}
        />
      </FormCard>
      <FormCard title="Websites and address">
        <SortableList
          label="Websites"
          items={page.websites}
          onChange={(websites) => set({ websites })}
          max={LIMITS.websites}
          addLabel="Add website"
          addAt="end"
          newRowFocus="input[type='url']"
          path="websites"
          errors={errors}
          itemLabel={(item, i) => rowName("website", item.label || item.url, i)}
          newItem={() => ({ label: "", url: "" })}
          render={(item, update, i) => (
            <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
              <TextField
                path={`websites.${i}.label`}
                errors={errors}
                label="Label"
                optional
                placeholder="Portfolio"
                value={item.label}
                onChange={(label) => update({ label })}
              />
              <TextField
                label="Website address"
                type="url"
                inputMode="url"
                value={item.url}
                onChange={(url) => update({ url })}
                path={`websites.${i}.url`}
                errors={errors}
                placeholder="example.com"
              />
            </div>
          )}
        />
        <TextField
          path="address"
          errors={errors}
          label="Address"
          optional
          value={page.address}
          onChange={(address) => set({ address })}
          autoComplete="street-address"
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
