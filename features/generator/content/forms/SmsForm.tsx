"use client";

import { Field } from "@/components/ui/Field";
import { Textarea, TextInput } from "@/components/ui/inputs";
import { validateSms } from "@/lib/qr/validators";

import type { FormProps } from "../types";
import { useTouched } from "../useTouched";

export function SmsForm({ values, onChange }: FormProps<"sms">) {
  const { touch, errorFor } = useTouched();
  return (
    <div className="flex flex-col gap-5">
      <Field
        label="Phone number"
        hint="Include the country code, like +1."
        error={errorFor("phone", validateSms(values))}
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
            data-field="phone"
            onBlur={() => touch("phone")}
          />
        )}
      </Field>
      <Field label="Message" optional hint="Pre-filled in the scanner's messaging app.">
        {(control) => (
          <Textarea
            {...control}
            rows={3}
            placeholder="I'd like to join the waitlist"
            value={values.message}
            onChange={(event) => onChange("message", event.target.value)}
          />
        )}
      </Field>
    </div>
  );
}
