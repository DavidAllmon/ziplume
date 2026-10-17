"use client";

import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/inputs";
import { LIMITS, type ImagesLayout, type ImagesPage } from "@/lib/pages/types";
import { mediaUrl } from "@/lib/pages/urls";

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
        <Field label="Layout">
          {(control) => (
            <Select
              {...control}
              data-field="layout"
              value={page.layout}
              onChange={(event) => set({ layout: event.target.value as ImagesLayout })}
            >
              <option value="grid2">Grid, 2 columns</option>
              <option value="grid3">Grid, 3 columns</option>
              <option value="single">One column</option>
              <option value="carousel">Carousel</option>
            </Select>
          )}
        </Field>
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
      {page.images.length > 0 && (
        <FormCard
          title="Captions and links"
          note="A caption describes the image for screen readers too. A link adds an Open link button."
        >
          <ol className="flex flex-col gap-4">
            {page.images.map((item, i) => (
              <li key={item.image.path} className="grid grid-cols-[3rem_1fr] gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element -- user uploads served from storage */}
                <img
                  src={mediaUrl(item.image.path)}
                  alt=""
                  className="size-12 rounded-md object-cover"
                />
                <div className="grid gap-3 sm:grid-cols-2">
                  <TextField
                    path={`images.${i}.caption`}
                    errors={errors}
                    label={`Image ${i + 1} caption`}
                    optional
                    value={item.caption}
                    onChange={(caption) =>
                      set((latest) => ({
                        images: latest.images.map((it) =>
                          it.image.path === item.image.path ? { ...it, caption } : it,
                        ),
                      }))
                    }
                  />
                  <TextField
                    path={`images.${i}.link`}
                    errors={errors}
                    label={`Image ${i + 1} link`}
                    optional
                    type="url"
                    inputMode="url"
                    placeholder="example.com"
                    value={item.link}
                    onChange={(link) =>
                      set((latest) => ({
                        images: latest.images.map((it) =>
                          it.image.path === item.image.path ? { ...it, link } : it,
                        ),
                      }))
                    }
                  />
                </div>
              </li>
            ))}
          </ol>
        </FormCard>
      )}
    </>
  );
}
