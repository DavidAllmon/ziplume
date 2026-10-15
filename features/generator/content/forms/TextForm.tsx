"use client";

import { Field } from "@/components/ui/Field";
import { Textarea } from "@/components/ui/inputs";
import { validateText } from "@/lib/qr/validators";

import type { FormProps } from "../types";
import { useTouched } from "../useTouched";

export function TextForm({ values, onChange }: FormProps<"text">) {
  const { touch, errorFor } = useTouched();
  return (
    <Field
      label="Text"
      hint="Plain text appears on screen after scanning. Keep it short for a simpler code."
      error={errorFor("text", validateText(values))}
    >
      {(control) => (
        <Textarea
          {...control}
          rows={5}
          placeholder="Table 12 · Free dessert with code SWEET"
          value={values.text}
          onChange={(event) => onChange("text", event.target.value)}
          data-field="text"
          onBlur={() => touch("text")}
        />
      )}
    </Field>
  );
}
