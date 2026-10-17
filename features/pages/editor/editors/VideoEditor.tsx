"use client";

import { LIMITS, type VideoPage } from "@/lib/pages/types";

import { AreaField, rowName, TextField } from "../fields";
import { FormCard } from "../FormCard";
import { SortableList } from "../sortable/SortableList";
import type { EditorProps } from "./shared";

export function VideoEditor({ page, set, errors }: EditorProps<VideoPage>) {
  return (
    <>
      <FormCard title="Videos" note="One below the other, each with its own title">
        <SortableList
          label="Videos"
          showLabel={false}
          items={page.videos}
          onChange={(videos) => set({ videos })}
          max={LIMITS.videos}
          addLabel="Add video"
          addAt="end"
          newRowFocus="input[type='url']"
          path="videos"
          errors={errors}
          itemLabel={(item, i) => rowName("video", item.title || item.url, i)}
          newItem={() => ({ title: "", url: "", start: "" })}
          render={(item, update, i) => (
            <div className="flex flex-col gap-3">
              <TextField
                label="Video link"
                type="url"
                inputMode="url"
                value={item.url}
                onChange={(url) => update({ url })}
                path={`videos.${i}.url`}
                errors={errors}
                placeholder="https://youtu.be/…"
                hint="YouTube, Vimeo, TikTok, Instagram, Facebook or Loom. The last four load when tapped."
              />
              <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
                <TextField
                  path={`videos.${i}.title`}
                  errors={errors}
                  label="Video title"
                  optional
                  value={item.title}
                  onChange={(title) => update({ title })}
                />
                <TextField
                  path={`videos.${i}.start`}
                  errors={errors}
                  label="Start at"
                  optional
                  placeholder="1:23"
                  hint="YouTube, Vimeo and Loom"
                  value={item.start}
                  onChange={(start) => update({ start })}
                />
              </div>
            </div>
          )}
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
