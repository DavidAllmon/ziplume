"use client";

import { type AudioPage } from "@/lib/pages/types";

import { AreaField, MediaField, TextField } from "../fields";
import type { EditorProps } from "./shared";

export function AudioEditor({
  page,
  set,
  errors,
  touched,
}: EditorProps<AudioPage> & { touched: boolean }) {
  return (
    <>
      <MediaField
        label="Audio file"
        kind="audio"
        value={page.file}
        onChange={(file) =>
          set({ file, title: page.title || file?.name.replace(/\.\w+$/, "") || "" })
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
        maxLength={2048}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField label="Title" optional value={page.title} onChange={(title) => set({ title })} />
        <TextField
          label="Artist"
          optional
          value={page.artist}
          onChange={(artist) => set({ artist })}
        />
      </div>
      <MediaField
        label="Cover art"
        kind="image"
        maxSide={1000}
        value={page.cover}
        onChange={(cover) => set({ cover })}
      />
      <AreaField
        label="Description"
        value={page.description}
        onChange={(description) => set({ description })}
      />
    </>
  );
}
