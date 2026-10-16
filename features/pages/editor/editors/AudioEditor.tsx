"use client";

import { type AudioPage } from "@/lib/pages/types";

import { AreaField, MediaField, TextField } from "../fields";
import { FormCard } from "../FormCard";
import type { EditorProps } from "./shared";

export function AudioEditor({
  page,
  set,
  errors,
  touched,
}: EditorProps<AudioPage> & { touched: boolean }) {
  return (
    <>
      <FormCard title="Audio">
        <MediaField
          label="Audio file"
          kind="audio"
          field="file"
          value={page.file}
          // From the latest page: a title typed while the file uploaded stays.
          onChange={(file) =>
            set((latest) => ({
              file,
              title: latest.title || file?.name.replace(/\.\w+$/, "") || "",
            }))
          }
          hint="MP3, M4A, WAV or OGG, up to 50 MB."
          error={touched ? errors.error("file") : undefined}
        />
        <TextField
          label="Or a link"
          optional
          type="url"
          inputMode="url"
          hint="Spotify, SoundCloud, Apple Podcasts…"
          value={page.link}
          onChange={(link) => set({ link })}
          path="link"
          errors={errors}
        />
      </FormCard>
      <FormCard title="Header" note="At the top of your page">
        <MediaField
          label="Cover art"
          kind="image"
          maxSide={1000}
          value={page.cover}
          onChange={(cover) => set({ cover })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            path="title"
            errors={errors}
            label="Title"
            optional
            value={page.title}
            onChange={(title) => set({ title })}
          />
          <TextField
            path="artist"
            errors={errors}
            label="Artist"
            optional
            value={page.artist}
            onChange={(artist) => set({ artist })}
          />
        </div>
      </FormCard>
      <FormCard title="Details">
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
