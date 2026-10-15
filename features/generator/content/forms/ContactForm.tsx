"use client";

import type { ComponentProps } from "react";

import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/inputs";
import type { ContactValues } from "@/lib/qr/types";
import { validateContact } from "@/lib/qr/validators";

import type { FormProps } from "../types";
import { useTouched } from "../useTouched";

type FieldConfig = {
  name: keyof ContactValues;
  label: string;
  wide?: boolean;
} & Pick<ComponentProps<"input">, "type" | "inputMode" | "autoComplete" | "placeholder">;

const FIELDS: FieldConfig[] = [
  { name: "firstName", label: "First name", autoComplete: "given-name", placeholder: "Ada" },
  { name: "lastName", label: "Last name", autoComplete: "family-name", placeholder: "Lovelace" },
  {
    name: "phone",
    label: "Phone",
    type: "tel",
    inputMode: "tel",
    autoComplete: "tel",
    placeholder: "+1 555 010 9999",
  },
  {
    name: "email",
    label: "Email",
    type: "email",
    inputMode: "email",
    autoComplete: "email",
    placeholder: "ada@example.com",
  },
  {
    name: "company",
    label: "Company",
    autoComplete: "organization",
    placeholder: "Analytical Engines Ltd",
  },
  {
    name: "title",
    label: "Job title",
    autoComplete: "organization-title",
    placeholder: "Engineer",
  },
  {
    name: "website",
    label: "Website",
    type: "url",
    inputMode: "url",
    autoComplete: "url",
    placeholder: "example.com",
    wide: true,
  },
];

export function ContactForm({ values, onChange }: FormProps<"contact">) {
  const { touch, errorFor } = useTouched();
  const errors = validateContact(values);
  return (
    <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
      {FIELDS.map(({ name, label, wide, ...input }) => (
        <Field
          key={name}
          label={label}
          error={errorFor(name, errors)}
          className={wide ? "sm:col-span-2" : undefined}
        >
          {(control) => (
            <TextInput
              {...control}
              {...input}
              value={values[name]}
              onChange={(event) => onChange(name, event.target.value)}
              data-field={name}
              onBlur={() => touch(name)}
            />
          )}
        </Field>
      ))}
    </div>
  );
}
