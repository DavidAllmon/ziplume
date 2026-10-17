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
          value={page.images.map((item) => item.image)}
          // Each image keeps its caption and link through moves and removals, found by its file.
          onChange={(files) =>
            set((latest) => ({
              images: files.map(
                (file) =>
                  latest.images.find((it) => it.image.path === file.path) ?? {
                    image: file,
                    caption: "",
                    link: "",
                  },
              ),
            }))
          }
          onAdd={(media) =>
            set((latest) => ({
              images: [...latest.images, { image: media, caption: "", link: "" }].slice(
                0,
                LIMITS.images,
              ),
            }))
          }
          max={LIMITS.images}
          field="images"
          error={touched ? errors.error("images") : undefined}
        />
      </FormCard>
    </>
  );
}
