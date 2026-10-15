"use client";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { type VideoPage } from "@/lib/pages/types";

import { AreaField, MediaField, TextField } from "../fields";
import type { EditorProps } from "./shared";

export function VideoEditor({
  page,
  set,
  errors,
  touched,
}: EditorProps<VideoPage> & { touched: boolean }) {
  return (
    <>
      <SegmentedControl
        aria-label="Video source"
        value={page.source}
        onChange={(source) => set({ source })}
        options={[
          { value: "link", label: "YouTube or Vimeo link" },
          { value: "upload", label: "Upload a video" },
        ]}
      />
      {page.source === "link" ? (
        <TextField
          label="Video link"
          type="url"
          inputMode="url"
          value={page.url}
          onChange={(url) => set({ url })}
          path="url"
          errors={errors}
          placeholder="https://youtu.be/…"
          maxLength={2048}
        />
      ) : (
        <MediaField
          label="Video"
          kind="video"
          value={page.file}
          onChange={(file) => set({ file })}
          hint="MP4, WebM or MOV, up to 50 MB."
          error={touched ? errors.error("file") : undefined}
        />
      )}
      <TextField label="Title" optional value={page.title} onChange={(title) => set({ title })} />
      <AreaField
        label="Description"
        value={page.description}
        onChange={(description) => set({ description })}
      />
    </>
  );
}
