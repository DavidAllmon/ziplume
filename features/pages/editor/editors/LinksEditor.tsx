"use client";

import { LIMITS, type LinksPage } from "@/lib/pages/types";

import { AreaField, LinksField, MediaField, SocialsField, TextField } from "../fields";
import { FormCard } from "../FormCard";
import type { EditorProps } from "./shared";

export function LinksEditor({ page, set, errors }: EditorProps<LinksPage>) {
  return (
    <>
      <FormCard title="Header" note="At the top of your page">
        <MediaField
          label="Profile picture"
          kind="image"
          round
          maxSide={512}
          value={page.avatar}
          onChange={(avatar) => set({ avatar })}
        />
        <TextField
          label="Title"
          value={page.title}
          onChange={(title) => set({ title })}
          path="title"
          errors={errors}
          placeholder="Your name or brand"
        />
        <AreaField
          label="Bio"
          value={page.bio}
          onChange={(bio) => set({ bio })}
          placeholder="A line or two about you"
        />
      </FormCard>
      <FormCard title="Links">
        <LinksField
          items={page.links}
          onChange={(links) => set({ links })}
          max={LIMITS.links}
          errors={errors}
        />
        {errors.error("links.0.url") && !page.links.length && (
          <p className="text-sm text-danger">{errors.error("links.0.url")}</p>
        )}
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
