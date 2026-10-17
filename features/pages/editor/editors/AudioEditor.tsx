"use client";

import { LIMITS, type AudioPage } from "@/lib/pages/types";
import { listenService } from "@/lib/pages/urls";

import { AreaField, MediaField, rowName, TextField } from "../fields";
import { FormCard } from "../FormCard";
import { SortableList } from "../sortable/SortableList";
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
          hint="MP3, M4A, WAV or OGG, up to 15 MB."
          error={touched ? errors.error("file") : undefined}
        />
        <TextField
          label="Or a link"
          optional
          type="url"
          inputMode="url"
          hint="A Spotify, SoundCloud or Apple Music link shows its player; others show a Listen button."
          value={page.link}
          onChange={(link) => set({ link })}
          path="link"
          errors={errors}
        />
      </FormCard>
      <FormCard title="Listen on" note="Buttons to your music on other services, up to 8">
        <SortableList
          label="Listen on links"
          showLabel={false}
          items={page.listen}
          onChange={(listen) => set({ listen })}
          max={LIMITS.listen}
          addLabel="Add Listen on link"
          addAt="end"
          newRowFocus="input[type='url']"
          path="listen"
          errors={errors}
          itemLabel={(item, i) => rowName("link", listenService(item.url)?.label ?? item.url, i)}
          newItem={() => ({ url: "" })}
          render={(item, update, i) => {
            const service = listenService(item.url);
            return (
              <TextField
                label="Listen on link"
                type="url"
                inputMode="url"
                value={item.url}
                onChange={(url) => update({ url })}
                path={`listen.${i}.url`}
                errors={errors}
                placeholder="open.spotify.com/artist/…"
                hint={
                  service
                    ? `Shows as Listen on ${service.label}`
                    : "Spotify, Apple Music, YouTube Music, Amazon Music, Deezer, Tidal, SoundCloud or Bandcamp"
                }
              />
            );
          }}
        />
      </FormCard>
      <FormCard title="Tracks" note="Up to 10; starting one pauses the others">
        <SortableList
          label="Tracks"
          showLabel={false}
          items={page.tracks}
          onChange={(tracks) => set({ tracks })}
          max={LIMITS.tracks}
          addLabel="Add track"
          addAt="end"
          newRowFocus="input[data-field$='.title']"
          path="tracks"
          errors={errors}
          itemLabel={(item, i) => rowName("track", item.title, i)}
          newItem={() => ({ title: "", file: null, link: "" })}
          render={(item, update, i) => (
            <div className="flex flex-col gap-3">
              <TextField
                path={`tracks.${i}.title`}
                errors={errors}
                label="Track title"
                value={item.title}
                onChange={(title) => update({ title })}
              />
              <MediaField
                label="Track file"
                kind="audio"
                field={`tracks.${i}.file`}
                value={item.file}
                onChange={(file) => update({ file })}
                hint="MP3, M4A, WAV or OGG, up to 15 MB."
                error={touched ? errors.error(`tracks.${i}.file`) : undefined}
              />
              <TextField
                label="Or the track’s link"
                optional
                type="url"
                inputMode="url"
                value={item.link}
                onChange={(link) => update({ link })}
                path={`tracks.${i}.link`}
                errors={errors}
              />
            </div>
          )}
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
