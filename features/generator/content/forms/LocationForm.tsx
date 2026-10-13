"use client";

import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/inputs";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { LocationMode } from "@/lib/qr/types";
import { validateLocation } from "@/lib/qr/validators";

import type { FormProps } from "../types";
import { useTouched } from "../useTouched";

const MODES = [
  { value: "address", label: "Address or place" },
  { value: "coordinates", label: "Coordinates" },
] as const satisfies readonly { value: LocationMode; label: string }[];

export function LocationForm({ values, onChange }: FormProps<"location">) {
  const { touch, errorFor } = useTouched();
  const errors = validateLocation(values);
  return (
    <div className="flex flex-col gap-5">
      <SegmentedControl
        aria-label="Location by"
        value={values.mode}
        onChange={(mode) => onChange("mode", mode)}
        options={MODES}
      />
      {values.mode === "address" ? (
        <Field
          label="Address or place name"
          hint="Opens in Google Maps on any phone."
          error={errorFor("query", errors)}
        >
          {(control) => (
            <TextInput
              {...control}
              autoComplete="street-address"
              placeholder="Eiffel Tower, Paris"
              value={values.query}
              onChange={(event) => onChange("query", event.target.value)}
              onBlur={() => touch("query")}
            />
          )}
        </Field>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Latitude" error={errorFor("latitude", errors)}>
            {(control) => (
              <TextInput
                {...control}
                inputMode="decimal"
                placeholder="48.8584"
                value={values.latitude}
                onChange={(event) => onChange("latitude", event.target.value)}
                onBlur={() => touch("latitude")}
              />
            )}
          </Field>
          <Field label="Longitude" error={errorFor("longitude", errors)}>
            {(control) => (
              <TextInput
                {...control}
                inputMode="decimal"
                placeholder="2.2945"
                value={values.longitude}
                onChange={(event) => onChange("longitude", event.target.value)}
                onBlur={() => touch("longitude")}
              />
            )}
          </Field>
        </div>
      )}
    </div>
  );
}
