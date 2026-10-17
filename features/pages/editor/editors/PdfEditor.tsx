"use client";

import { type PdfPage } from "@/lib/pages/types";

import { AreaField, MediaField, TextField, ToggleField } from "../fields";
import { FormCard } from "../FormCard";
import type { EditorProps } from "./shared";

export function PdfEditor({
  page,
  set,
  errors,
  touched,
}: EditorProps<PdfPage> & { touched: boolean }) {
  return (
    <>
      <FormCard title="File">
        <MediaField
          label="PDF"
          kind="pdf"
          field="files.0.file"
          value={page.files[0]?.file ?? null}
          // From the latest page: a title typed while the file uploaded stays.
          onChange={(file) =>
            set((latest) => ({
              files: [
                { title: "", ...latest.files[0], file, preview: null },
                ...latest.files.slice(1),
              ],
              title: latest.title || file?.name.replace(/\.pdf$/i, "") || "",
            }))
          }
          hint="Up to 10 MB."
          error={touched ? (errors.error("files.0.file") ?? undefined) : undefined}
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
      <FormCard title="Opening">
        <ToggleField
          label="Open the PDF straight away"
          description="Skip the page: scanning opens the file directly."
          checked={page.direct}
          onChange={(direct) => set({ direct })}
        />
      </FormCard>
    </>
  );
}
