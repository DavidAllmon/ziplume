"use client";

import { type VideoPage } from "@/lib/pages/types";

import { AreaField, TextField } from "../fields";
import { FormCard } from "../FormCard";
import type { EditorProps } from "./shared";

export function VideoEditor({ page, set, errors }: EditorProps<VideoPage>) {
  return (
    <>
      <FormCard title="Video">
        <TextField
          label="Video link"
          type="url"
          inputMode="url"
          value={page.url}
          onChange={(url) => set({ url })}
          path="url"
          errors={errors}
          placeholder="https://youtu.be/…"
          hint="A YouTube or Vimeo link."
        />
      </FormCard>
      <FormCard title="Details">
        <TextField
          path="title"
          errors={errors}
          label="Title"
          optional
          value={page.title}
          onChange={(title) => set({ title })}
        />
        <AreaField
          path="description"
          errors={errors}
          label="Description"
          value={page.description}
          onChange={(description) => set({ description })}
        />
      </FormCard>
    </>
  );
}
