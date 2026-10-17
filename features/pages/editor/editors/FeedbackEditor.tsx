"use client";

import { type FeedbackPage } from "@/lib/pages/types";

import { AreaField, MediaField, TextField, ToggleField } from "../fields";
import { FormCard } from "../FormCard";
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
      <FormCard title="Question">
        <TextField
          label="Question"
          value={page.questions[0]?.text ?? ""}
          onChange={(text) =>
            set((latest) => ({
              questions: [
                { style: "stars" as const, ...latest.questions[0], text },
                ...latest.questions.slice(1),
              ],
            }))
          }
          path="questions.0.text"
          errors={errors}
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
        <p className="rounded-control bg-surface-2 px-3.5 py-3 text-sm text-fg-muted">
          Responses appear on this code’s page in My codes.
        </p>
      </FormCard>
    </>
  );
}
