"use client";

import { useContext } from "react";

import { LIMITS, type Media, type PdfPage } from "@/lib/pages/types";
import { mediaUrl } from "@/lib/pages/urls";

import { AreaField, MediaField, rowName, TextField, ToggleField } from "../fields";
import { FormCard } from "../FormCard";
import { MediaOwnerContext } from "../MediaOwner";
import { pdfFirstPage } from "../pdfFirstPage";
import { SortableList } from "../sortable/SortableList";
import { uploadMedia } from "../upload";
import type { EditorProps } from "./shared";

/** Draws the PDF's first page and uploads it as an 800px image; null if either step fails. */
async function previewOf(file: File, ownerId: string | null): Promise<Media | null> {
  const blob = await pdfFirstPage(file, 800);
  if (!blob) return null;
  const image = new File([blob], file.name.replace(/\.pdf$/i, "") + ".webp", {
    type: "image/webp",
  });
  const result = await uploadMedia(image, "image", { maxSide: 800, ownerId });
  return result.ok ? result.media : null;
}

export function PdfEditor({
  page,
  set,
  errors,
  touched,
}: EditorProps<PdfPage> & { touched: boolean }) {
  const ownerId = useContext(MediaOwnerContext);
  return (
    <>
      <FormCard title="PDFs" note="Up to 10, each with its first page shown">
        <SortableList
          label="PDFs"
          showLabel={false}
          items={page.files}
          onChange={(files) => set({ files })}
          max={LIMITS.pdfs}
          addLabel="Add PDF"
          addAt="end"
          path="files"
          errors={errors}
          itemLabel={(item, i) => rowName("PDF", item.title || item.file?.name || "", i)}
          newItem={() => ({ file: null, title: "", preview: null })}
          render={(item, update, i) => (
            <div className="flex flex-col gap-3">
              <MediaField
                label="PDF"
                kind="pdf"
                field={`files.${i}.file`}
                value={item.file}
                hint="Up to 10 MB. Its first page is shown as a preview."
                error={touched ? errors.error(`files.${i}.file`) : undefined}
                // Replacing or removing the file drops the old preview.
                onChange={(file) => {
                  update({ file, preview: null });
                  // The page's title starts as the first PDF's name, unless one was typed.
                  if (file && i === 0) {
                    set((latest) =>
                      latest.title ? {} : { title: file.name.replace(/\.pdf$/i, "") },
                    );
                  }
                }}
                onFile={(original, uploaded) => {
                  void previewOf(original, ownerId).then((preview) => {
                    // Only onto the file it was drawn from, if that's still the row's file.
                    if (preview) {
                      set((latest) => ({
                        files: latest.files.map((f) =>
                          f.file?.path === uploaded.path ? { ...f, preview } : f,
                        ),
                      }));
                    }
                  });
                }}
              />
              {item.preview && (
                // eslint-disable-next-line @next/next/no-img-element -- uploaded preview
                <img
                  src={mediaUrl(item.preview.path)}
                  alt="First page preview"
                  className="h-24 w-auto self-start rounded border border-border bg-white"
                />
              )}
              <TextField
                path={`files.${i}.title`}
                errors={errors}
                label="PDF title"
                optional
                placeholder={item.file?.name.replace(/\.pdf$/i, "") || "Wine list"}
                value={item.title}
                onChange={(title) => update({ title })}
              />
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
      <FormCard title="Opening">
        <ToggleField
          label="Open the PDF straight away"
          description="Skip the page: scanning opens the file directly. This works with one PDF; with several, scanning shows the list."
          checked={page.direct}
          onChange={(direct) => set({ direct })}
        />
      </FormCard>
    </>
  );
}
