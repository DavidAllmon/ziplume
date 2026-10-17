"use client";

import { LIMITS, type VcardPage } from "@/lib/pages/types";

import { AreaField, MediaField, rowName, SocialsField, TextField } from "../fields";
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
      <FormCard title="Website and address">
        <TextField
          label="Website"
          optional
          type="url"
          inputMode="url"
          value={page.websites[0]?.url ?? ""}
          onChange={(url) =>
            set((latest) => ({ websites: [{ label: "", url }, ...latest.websites.slice(1)] }))
          }
          path="websites.0.url"
          errors={errors}
          placeholder="example.com"
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
