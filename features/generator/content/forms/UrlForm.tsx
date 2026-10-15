"use client";

import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/inputs";
import { validateUrl } from "@/lib/qr/validators";

import type { FormProps } from "../types";
import { useTouched } from "../useTouched";

export function UrlForm({ values, onChange }: FormProps<"url">) {
  const { touch, errorFor } = useTouched();
  const errors = validateUrl(values);
  return (
    <Field
      label="Website address"
      hint="We'll add https:// if you leave it out."
      error={errorFor("url", errors)}
    >
      {(control) => (
        <TextInput
          {...control}
          type="url"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          spellCheck={false}
          placeholder="example.com/menu"
          value={values.url}
          onChange={(event) => onChange("url", event.target.value)}
          data-field="url"
          onBlur={() => touch("url")}
        />
      )}
    </Field>
  );
}
