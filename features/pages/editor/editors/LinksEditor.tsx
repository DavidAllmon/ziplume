"use client";

import { LIMITS, type LinksPage } from "@/lib/pages/types";

import { AreaField, LinksField, MediaField, SocialsField, TextField } from "../fields";
import type { EditorProps } from "./shared";

export function LinksEditor({ page, set, errors }: EditorProps<LinksPage>) {
  return (
    <>
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
      <LinksField
        items={page.links}
        onChange={(links) => set({ links })}
        max={LIMITS.links}
        errors={errors}
      />
      {errors.error("links.0.url") && !page.links.length && (
        <p className="text-sm text-danger">{errors.error("links.0.url")}</p>
      )}
      <SocialsField
        items={page.socials}
        onChange={(socials) => set({ socials })}
        max={LIMITS.socials}
        errors={errors}
      />
    </>
  );
}
