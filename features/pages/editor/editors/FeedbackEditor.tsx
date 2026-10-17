"use client";

import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/inputs";
import { RATING_STYLES, reviewLabel, STYLE_LABEL, type RatingStyle } from "@/lib/pages/feedback";
import { LIMITS, type FeedbackPage } from "@/lib/pages/types";

import { AreaField, MediaField, rowName, TextField, ToggleField } from "../fields";
import { FormCard } from "../FormCard";
import { SortableList } from "../sortable/SortableList";
import type { EditorProps } from "./shared";

export function FeedbackEditor({ page, set, errors }: EditorProps<FeedbackPage>) {
  return (
    <>
      <FormCard title="Header" note="At the top of your page">
        <MediaField
          label="Logo"
          kind="image"
          maxSide={512}
          value={page.logo}
          onChange={(logo) => set({ logo })}
        />
        <TextField
          label="Business name"
          value={page.business}
          onChange={(business) => set({ business })}
          path="business"
          errors={errors}
        />
      </FormCard>
      <FormCard title="Questions" note="Up to 3. Comment and contact boxes come after them.">
        <SortableList
          label="Questions"
          showLabel={false}
          items={page.questions}
          onChange={(questions) => set({ questions })}
          max={LIMITS.questions}
          addLabel="Add question"
          addAt="end"
          newRowFocus="input[data-field$='.text']"
          path="questions"
          errors={errors}
          itemLabel={(item, i) => rowName("question", item.text, i)}
          newItem={() => ({ text: "", style: "stars" as const })}
          render={(item, update, i) => (
            <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
              <TextField
                label="Question"
                value={item.text}
                onChange={(text) => update({ text })}
                path={`questions.${i}.text`}
                errors={errors}
                placeholder="How was your visit?"
              />
              <Field label="Rating style">
                {(control) => (
                  <Select
                    {...control}
                    data-field={`questions.${i}.style`}
                    value={item.style}
                    onChange={(event) => update({ style: event.target.value as RatingStyle })}
                  >
                    {RATING_STYLES.map((style) => (
                      <option key={style} value={style}>
                        {STYLE_LABEL[style]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          )}
        />
        <ToggleField
          label="Ask for a comment"
          checked={page.allowComment}
          onChange={(allowComment) => set({ allowComment })}
        />
        <ToggleField
          label="Ask for contact details"
          description="Optional for the visitor, so you can reply."
          checked={page.askContact}
          onChange={(askContact) => set({ askContact })}
        />
      </FormCard>
      <FormCard title="After sending">
        <AreaField
          path="thanks"
          errors={errors}
          label="Thank-you message"
          value={page.thanks}
          onChange={(thanks) => set({ thanks })}
        />
        <TextField
          label="Review link"
          optional
          type="url"
          inputMode="url"
          value={page.reviewUrl}
          onChange={(reviewUrl) => set({ reviewUrl })}
          path="reviewUrl"
          errors={errors}
          placeholder="g.page/r/…/review"
          hint={
            reviewLabel(page.reviewUrl)
              ? `Shows as ${reviewLabel(page.reviewUrl)} after sending, to everyone.`
              : "Your Google review link, or another site's. Everyone sees it after sending."
          }
        />
        <p className="rounded-control bg-surface-2 px-3.5 py-3 text-sm text-fg-muted">
          Responses appear on this code’s page in My codes.
        </p>
      </FormCard>
    </>
  );
}
