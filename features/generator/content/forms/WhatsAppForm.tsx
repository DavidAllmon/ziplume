"use client";

import { Field } from "@/components/ui/Field";
import { Textarea, TextInput } from "@/components/ui/inputs";
import { validateWhatsApp } from "@/lib/qr/validators";

import type { FormProps } from "../types";
import { useTouched } from "../useTouched";

export function WhatsAppForm({ values, onChange }: FormProps<"whatsapp">) {
  const { touch, errorFor } = useTouched();
  return (
    <div className="flex flex-col gap-5">
      <Field
        label="WhatsApp number"
        hint="The full number with country code, like +1 for the US."
        error={errorFor("phone", validateWhatsApp(values))}
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
      <Field label="Message" optional hint="Pre-filled when the chat opens.">
        {(control) => (
          <Textarea
            {...control}
            rows={3}
            placeholder="Hi! I'd like to book a table."
            value={values.message}
            onChange={(event) => onChange("message", event.target.value)}
          />
        )}
      </Field>
    </div>
  );
}
