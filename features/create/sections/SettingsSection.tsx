"use client";

import { useId } from "react";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/inputs";
import { Toggle } from "@/components/ui/Toggle";
import { shortLinkLabel } from "@/lib/env";
import { isPageType, type CodeTypeId } from "@/lib/qr/types";

import { typeLabel } from "../catalog";
import { settingsErrors, type CreateSettings } from "../state";

const UTM_FIELDS = [
  { key: "source", label: "Source", placeholder: "flyer" },
  { key: "medium", label: "Medium", placeholder: "qr" },
  { key: "campaign", label: "Campaign", placeholder: "fall-menu" },
] as const;

/** Editing a saved code: what it has now, so the section can explain what can't change. */
export interface SavedSettings {
  /** The saved short-link ending (null for static codes). */
  slug: string | null;
  hasPassword: boolean;
  /** Remove was chosen: the password goes when the code is saved. */
  removePassword: boolean;
  onRemovePassword: (remove: boolean) => void;
}

/** The Settings tab: tracking, a password, active dates and the short link. Off, with why, when static. */
export function SettingsSection({
  type,
  settings,
  onChange,
  saved,
}: {
  type: CodeTypeId;
  settings: CreateSettings;
  onChange: (patch: Partial<CreateSettings>) => void;
  /** Present when editing a saved code. */
  saved?: SavedSettings;
}) {
  const reasonId = useId();
  const hosted = isPageType(type);
  const link = type === "url";
  const trackable = hosted || (link && settings.trackable);
  const errors = trackable ? settingsErrors(settings, { requireSlug: saved !== undefined }) : {};
  const slugChanged = saved?.slug != null && settings.slug !== saved.slug;
  const reason = link
    ? "Static codes can’t change after printing."
    : `${typeLabel(type)} codes work without internet, so they can’t change after printing.`;

  return (
    <Card aria-labelledby="settings-heading">
      <CardHeader
        id="settings-heading"
        title="Settings"
        description="Tracking, a password, active dates and the short link."
      />
      <div className="flex flex-col gap-5 px-5 pt-4 pb-6 sm:px-6">
        {link && !saved && (
          <Toggle
            label="Trackable"
            description="Change where it points after printing, and see scans."
            checked={settings.trackable}
            onChange={(on) => onChange({ trackable: on })}
          />
        )}
        {link && saved && (
          <p className="text-sm text-fg-muted">
            <span className="font-medium text-fg">
              Trackable is {settings.trackable ? "on" : "off"}.
            </span>{" "}
            Printed codes depend on this, so it can’t change.
          </p>
        )}
        {hosted && (
          <p className="text-sm text-fg-muted">
            Hosted pages are always trackable: edit them any time and see scans.
          </p>
        )}
        {!trackable && (
          <p id={reasonId} className="rounded-control bg-surface-2 px-3.5 py-2.5 text-sm text-fg">
            {reason}
          </p>
        )}
        <fieldset
          disabled={!trackable}
          aria-describedby={trackable ? undefined : reasonId}
          className="flex min-w-0 flex-col gap-5"
        >
          <legend className="sr-only">Settings for trackable codes</legend>
          {saved?.hasPassword && saved.removePassword ? (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-fg">The password will be removed when you save.</p>
              <Button
                variant="outline"
                className="self-start"
                onClick={() => saved.onRemovePassword(false)}
              >
                Keep the password
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Field
                label="Code password"
                optional={!saved?.hasPassword}
                hint={
                  saved?.hasPassword
                    ? "This code has a password. Leave this blank to keep it, or type a new one."
                    : "4 to 128 characters. Scanners need it to open the code."
                }
                error={errors.password}
              >
                {(control) => (
                  <TextInput
                    {...control}
                    type="password"
                    autoComplete="new-password"
                    maxLength={128}
                    value={settings.password}
                    onChange={(event) => onChange({ password: event.target.value })}
                  />
                )}
              </Field>
              {saved?.hasPassword && (
                <Button
                  variant="outline"
                  className="self-start"
                  onClick={() => {
                    onChange({ password: "" });
                    saved.onRemovePassword(true);
                  }}
                >
                  Remove password
                </Button>
              )}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts" optional hint="Before this, scanners see “not active yet”.">
                {(control) => (
                  <TextInput
                    {...control}
                    type="datetime-local"
                    value={settings.startsAt}
                    onChange={(event) => onChange({ startsAt: event.target.value })}
                  />
                )}
              </Field>
              <Field
                label="Ends"
                optional
                hint="After this, scanners see “expired”."
                error={errors.endsAt}
              >
                {(control) => (
                  <TextInput
                    {...control}
                    type="datetime-local"
                    value={settings.endsAt}
                    onChange={(event) => onChange({ endsAt: event.target.value })}
                  />
                )}
              </Field>
            </div>
            <p className="text-sm text-fg-muted">Times are in your time zone.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Field
              label="Short link ending"
              optional={!saved}
              hint={
                settings.slug && !errors.slug
                  ? `Opens ${shortLinkLabel(settings.slug)}`
                  : saved
                    ? undefined
                    : "Leave it blank for a random ending."
              }
              error={errors.slug}
            >
              {(control) => (
                <TextInput
                  {...control}
                  maxLength={40}
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  value={settings.slug}
                  onChange={(event) => onChange({ slug: event.target.value.trim() })}
                />
              )}
            </Field>
            {slugChanged && (
              <p className="text-sm text-warning">
                Codes you’ve already printed or shared use the current link and will stop working.
              </p>
            )}
          </div>
          {link && (
            <fieldset className="flex min-w-0 flex-col gap-3">
              <legend className="text-sm font-medium text-fg">
                Campaign tracking <span className="font-normal text-fg-muted">(optional)</span>
              </legend>
              <p className="text-sm text-fg-muted">
                Adds utm_ tags to the link so Google Analytics shows these visits as coming from
                this code.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                {UTM_FIELDS.map((field) => (
                  <Field key={field.key} label={field.label}>
                    {(control) => (
                      <TextInput
                        {...control}
                        placeholder={field.placeholder}
                        value={settings.utm[field.key] ?? ""}
                        onChange={(event) =>
                          onChange({ utm: { ...settings.utm, [field.key]: event.target.value } })
                        }
                      />
                    )}
                  </Field>
                ))}
              </div>
            </fieldset>
          )}
        </fieldset>
      </div>
    </Card>
  );
}
