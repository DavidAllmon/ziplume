"use client";

import { LIMITS, type ImagesPage } from "@/lib/pages/types";

import { AreaField, ImagesField, TextField } from "../fields";
import { FormCard } from "../FormCard";
import type { EditorProps } from "./shared";

export function ImagesEditor({
  page,
  set,
  errors,
  touched,
}: EditorProps<ImagesPage> & { touched: boolean }) {
  return (
    <>
      <FormCard title="Details">
        <TextField
          path="title"
          errors={errors}
          label="Title"
          optional
          value={page.title}
          onChange={(title) => set({ title })}
          placeholder="Our wedding"
        />
        <AreaField
          path="description"
          errors={errors}
          label="Description"
          value={page.description}
          onChange={(description) => set({ description })}
        />
      </FormCard>
      <FormCard title="Images">
        <ImagesField
          value={page.images}
          onChange={(images) => set({ images })}
          onAdd={(media) =>
            set((latest) => ({ images: [...latest.images, media].slice(0, LIMITS.images) }))
          }
          max={LIMITS.images}
          field="images"
          error={touched ? errors.error("images") : undefined}
        />
      </FormCard>
    </>
  );
}
