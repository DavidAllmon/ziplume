"use client";

import { LIMITS, type VcardPage } from "@/lib/pages/types";

import { AreaField, ListField, MediaField, SocialsField, TextField } from "../fields";
import type { EditorProps } from "./shared";

export function VcardEditor({ page, set, errors }: EditorProps<VcardPage>) {
  return (
    <>
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
          maxLength={60}
        />
        <TextField
          label="Last name"
          value={page.lastName}
          onChange={(lastName) => set({ lastName })}
          autoComplete="family-name"
          maxLength={60}
        />
        <TextField
          label="Job title"
          optional
          value={page.jobTitle}
          onChange={(jobTitle) => set({ jobTitle })}
        />
        <TextField
          label="Company"
          optional
          value={page.company}
          onChange={(company) => set({ company })}
        />
      </div>
      <AreaField label="About" value={page.bio} onChange={(bio) => set({ bio })} />
      <ListField
        label="Phone numbers"
        items={page.phones}
        onChange={(phones) => set({ phones })}
        max={LIMITS.phones}
        addLabel="Add phone"
        itemName="phone"
        newItem={() => ({ label: "Mobile", number: "" })}
        render={(item, update, i) => (
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
            <TextField
              label="Label"
              value={item.label}
              onChange={(label) => update({ label })}
              maxLength={30}
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
              maxLength={40}
            />
          </div>
        )}
      />
      <ListField
        label="Email addresses"
        items={page.emails}
        onChange={(emails) => set({ emails })}
        max={LIMITS.emails}
        addLabel="Add email"
        itemName="email"
        newItem={() => ({ label: "Work", address: "" })}
        render={(item, update, i) => (
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
            <TextField
              label="Label"
              value={item.label}
              onChange={(label) => update({ label })}
              maxLength={30}
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
              maxLength={254}
            />
          </div>
        )}
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
        placeholder="example.com"
        maxLength={2048}
      />
      <TextField
        label="Address"
        optional
        value={page.address}
        onChange={(address) => set({ address })}
        autoComplete="street-address"
        maxLength={300}
      />
      <SocialsField
        items={page.socials}
        onChange={(socials) => set({ socials })}
        max={LIMITS.socials}
        errors={errors}
      />
    </>
  );
}
