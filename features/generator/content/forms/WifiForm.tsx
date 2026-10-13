"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";

import { IconButton } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/inputs";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Toggle } from "@/components/ui/Toggle";
import type { WifiSecurity } from "@/lib/qr/types";
import { validateWifi } from "@/lib/qr/validators";

import type { FormProps } from "../types";
import { useTouched } from "../useTouched";

const SECURITY = [
  { value: "WPA", label: "WPA/WPA2/WPA3" },
  { value: "WEP", label: "WEP" },
  { value: "nopass", label: "None" },
] as const satisfies readonly { value: WifiSecurity; label: string }[];

export function WifiForm({ values, onChange }: FormProps<"wifi">) {
  const { touch, errorFor } = useTouched();
  const [showPassword, setShowPassword] = useState(false);
  const errors = validateWifi(values);

  return (
    <div className="flex flex-col gap-5">
      <Field label="Network name (SSID)" error={errorFor("ssid", errors)}>
        {(control) => (
          <TextInput
            {...control}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="HomeNet"
            value={values.ssid}
            onChange={(event) => onChange("ssid", event.target.value)}
            onBlur={() => touch("ssid")}
          />
        )}
      </Field>

      <div className="flex flex-col gap-1.5">
        <span aria-hidden className="text-sm font-medium text-fg">
          Security
        </span>
        <SegmentedControl
          aria-label="Security"
          value={values.security}
          onChange={(security) => onChange("security", security)}
          options={SECURITY}
        />
      </div>

      {values.security !== "nopass" && (
        <Field label="Password" error={errorFor("password", errors)}>
          {(control) => (
            <div className="relative">
              <TextInput
                {...control}
                type={showPassword ? "text" : "password"}
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                className="pr-12"
                value={values.password}
                onChange={(event) => onChange("password", event.target.value)}
                onBlur={() => touch("password")}
              />
              <IconButton
                label={showPassword ? "Hide password" : "Show password"}
                size="icon-sm"
                className="absolute top-1 right-1"
                onClick={() => setShowPassword((shown) => !shown)}
              >
                {showPassword ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
              </IconButton>
            </div>
          )}
        </Field>
      )}

      <Toggle
        label="Hidden network"
        description="Turn on if your network doesn't broadcast its name."
        checked={values.hidden}
        onChange={(hidden) => onChange("hidden", hidden)}
      />
    </div>
  );
}
