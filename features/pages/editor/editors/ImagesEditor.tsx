"use client";

import { LIMITS, type ImagesPage } from "@/lib/pages/types";

import { AreaField, ImagesField, TextField } from "../fields";
import type { EditorProps } from "./shared";

export function ImagesEditor({
  page,
  set,
  errors,
  touched,
}: EditorProps<ImagesPage> & { touched: boolean }) {
  return (
    <>
      <TextField
        label="Title"
        optional
        value={page.title}
        onChange={(title) => set({ title })}
        placeholder="Our wedding"
      />
      <AreaField
        label="Description"
        value={page.description}
        onChange={(description) => set({ description })}
      />
      <ImagesField
        value={page.images}
        onChange={(images) => set({ images })}
        max={LIMITS.images}
        field="images"
        error={touched ? errors.error("images") : undefined}
      />
    </>
  );
}
