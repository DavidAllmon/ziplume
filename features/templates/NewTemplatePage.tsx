"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useReducer, useRef, useState, type FormEvent } from "react";

import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/inputs";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import { DesignSection } from "@/features/create/sections/DesignSection";
import { QrView } from "@/features/generator/preview/QrView";
import { initialState } from "@/features/generator/state/defaults";
import { generatorReducer } from "@/features/generator/state/reducer";
import { sanitizeDesign } from "@/features/generator/state/sanitize";
import type { DesignState, GeneratorAction } from "@/features/generator/state/types";
import type { RenderOptions } from "@/lib/qr/renderer";

import { saveTemplate, setDefaultTemplate } from "./api";

const SAMPLE = "https://ziplume.com";

/** "New template" (redesign spec 4.5): the Design panel alone, with a name and Save. */
export function NewTemplatePage() {
  const router = useRouter();
  const toast = useToast();
  const nameId = useId();
  const nameRef = useRef<HTMLInputElement>(null);
  const [state, dispatchCode] = useReducer(generatorReducer, undefined, initialState);
  // The style last applied, for Reset to style.
  const [style, setStyle] = useState<DesignState>(() => state.design);
  const [name, setName] = useState("");
  const [makeDefault, setMakeDefault] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const dispatch = (action: GeneratorAction) => {
    // An applied style arrives unchecked; the reducer cleans it the same way.
    if (action.type === "applyDesign") setStyle(sanitizeDesign(action.design));
    dispatchCode(action);
  };
  const preview: RenderOptions = useMemo(
    () => ({ ...state.design, data: SAMPLE, size: 600 }),
    [state.design],
  );

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Name the template");
      nameRef.current?.focus();
      return;
    }
    setSaving(true);
    const result = await saveTemplate(name, state.design);
    if (!result.ok) {
      setSaving(false);
      return toast(result.error, "error");
    }
    if (makeDefault) {
      const set = await setDefaultTemplate(result.value.id);
      if (!set.ok) toast(set.error, "error");
    }
    toast(
      result.droppedLogo
        ? `Saved “${result.value.name}”. The logo was too large to store and was left out.`
        : `Saved “${result.value.name}”`,
    );
    router.push("/templates");
  }

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-6">
      <PageHeader title="New template" description="Design it once, then use it for any code." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <DesignSection
          design={state.design}
          dispatch={dispatch}
          onResetToStyle={() => dispatchCode({ type: "applyDesign", design: style })}
          saveTemplates={false}
        />
        <div className="flex flex-col gap-4 lg:sticky lg:top-6">
          <Card>
            <div className="flex flex-col gap-4 p-5">
              <div className="mx-auto w-full max-w-60 overflow-hidden rounded-xl bg-white p-3 ring-1 ring-black/5">
                <QrView options={preview} resolution={600} label="Preview of the template" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={nameId} className="text-sm font-medium text-fg">
                  Name
                </label>
                <TextInput
                  ref={nameRef}
                  id={nameId}
                  value={name}
                  maxLength={60}
                  placeholder="Brand"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${nameId}-error` : undefined}
                  onChange={(event) => {
                    setName(event.target.value);
                    setError("");
                  }}
                />
                {error && (
                  <p id={`${nameId}-error`} className="text-sm text-danger">
                    {error}
                  </p>
                )}
              </div>
              <Toggle
                label="Use for new codes"
                description="Every code you make will start from this design."
                checked={makeDefault}
                onChange={setMakeDefault}
              />
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save template"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </form>
  );
}
