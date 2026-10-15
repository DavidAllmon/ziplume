"use client";

import { type PdfPage } from "@/lib/pages/types";

import { AreaField, MediaField, TextField, ToggleField } from "../fields";
import type { EditorProps } from "./shared";

export function PdfEditor({
  page,
  set,
  errors,
  touched,
}: EditorProps<PdfPage> & { touched: boolean }) {
  return (
    <>
      <MediaField
        label="PDF"
        kind="pdf"
        value={page.file}
        onChange={(file) =>
          set({ file, title: page.title || file?.name.replace(/\.pdf$/i, "") || "" })
        }
        hint="Up to 50 MB."
        error={touched ? (errors.error("file") ?? undefined) : undefined}
      />
      <TextField label="Title" optional value={page.title} onChange={(title) => set({ title })} />
      <AreaField
        label="Description"
        value={page.description}
        onChange={(description) => set({ description })}
      />
      <ToggleField
        label="Open the PDF straight away"
        description="Skip the page: scanning opens the file directly."
        checked={page.direct}
        onChange={(direct) => set({ direct })}
      />
    </>
  );
}
