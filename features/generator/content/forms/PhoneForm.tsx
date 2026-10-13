"use client";

import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/inputs";
import { validatePhone } from "@/lib/qr/validators";

import type { FormProps } from "../types";
import { useTouched } from "../useTouched";

export function PhoneForm({ values, onChange }: FormProps<"phone">) {
  const { touch, errorFor } = useTouched();
  return (
    <Field
      label="Phone number"
      hint="Include the country code, like +1, so it works everywhere."
      error={errorFor("phone", validatePhone(values))}
    >
      {(control) => (
        <TextInput
          {...control}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+1 555 010 9999"
          value={values.phone}
          onChange={(event) => onChange("phone", event.target.value)}
          onBlur={() => touch("phone")}
        />
      )}
    </Field>
  );
}
