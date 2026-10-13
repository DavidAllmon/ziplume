"use client";

import { Field } from "@/components/ui/Field";
import { Textarea, TextInput } from "@/components/ui/inputs";
import { validateEmail } from "@/lib/qr/validators";

import type { FormProps } from "../types";
import { useTouched } from "../useTouched";

export function EmailForm({ values, onChange }: FormProps<"email">) {
  const { touch, errorFor } = useTouched();
  const errors = validateEmail(values);
  return (
    <div className="flex flex-col gap-5">
      <Field label="Send to" error={errorFor("to", errors)}>
        {(control) => (
          <TextInput
            {...control}
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="hello@example.com"
            value={values.to}
            onChange={(event) => onChange("to", event.target.value)}
            onBlur={() => touch("to")}
          />
        )}
      </Field>
      <Field label="Subject" optional>
        {(control) => (
          <TextInput
            {...control}
            placeholder="Question about my order"
            value={values.subject}
            onChange={(event) => onChange("subject", event.target.value)}
          />
        )}
      </Field>
      <Field label="Message" optional>
        {(control) => (
          <Textarea
            {...control}
            rows={4}
            value={values.body}
            onChange={(event) => onChange("body", event.target.value)}
          />
        )}
      </Field>
    </div>
  );
}
