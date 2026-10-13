"use client";

import { Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { Button, IconButton } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/inputs";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/features/auth/useSession";
import { deleteTemplate, listTemplates, saveTemplate } from "@/features/templates/api";
import { accountsEnabled } from "@/lib/env";
import type { RenderOptions } from "@/lib/qr/renderer";
import type { DesignTemplateRow } from "@/types/supabase";

import { QrView } from "../preview/QrView";
import { sanitizeDesign } from "../state/sanitize";
import { QUICK_STYLES } from "../state/templates";
import type { DesignState, GeneratorAction } from "../state/types";

const SAMPLE = "QuickQReate";

function StylePreview({ design }: { design: DesignState }) {
  const options: RenderOptions = useMemo(() => ({ ...design, data: SAMPLE, size: 240 }), [design]);
  return (
    <span
      aria-hidden
      className="block overflow-hidden rounded-lg bg-white p-1.5 ring-1 ring-black/5"
    >
      <QrView options={options} resolution={240} label="" />
    </span>
  );
}

interface TemplatesSectionProps {
  design: DesignState;
  dispatch: (action: GeneratorAction) => void;
}

export function TemplatesSection({ design, dispatch }: TemplatesSectionProps) {
  return (
    <>
      <div className="flex flex-col gap-2">
        <span id="quick-styles" className="text-sm font-medium text-fg">
          Quick styles
        </span>
        <div
          role="group"
          aria-labelledby="quick-styles"
          className="grid grid-cols-3 gap-2 sm:grid-cols-6"
        >
          {QUICK_STYLES.map((style) => (
            <button
              key={style.id}
              type="button"
              onClick={() => dispatch({ type: "applyDesign", design: style.design })}
              className="flex flex-col gap-1.5 rounded-control border border-border bg-surface p-1.5 text-xs font-medium text-fg-muted focus-ring transition-colors hover:border-field-border hover:text-fg"
            >
              <StylePreview design={style.design} />
              {style.name}
            </button>
          ))}
        </div>
        <p className="text-sm text-fg-muted">Applying a style keeps your logo.</p>
      </div>
      {accountsEnabled && <MyTemplates design={design} dispatch={dispatch} />}
    </>
  );
}

function MyTemplates({ design, dispatch }: TemplatesSectionProps) {
  const { user, loading } = useSession();
  const toast = useToast();
  const [templates, setTemplates] = useState<DesignTemplateRow[] | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const result = await listTemplates();
    if (result.ok) setTemplates(result.value);
    else toast(result.error, "error");
  }, [toast]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    listTemplates().then((result) => {
      if (active && result.ok) setTemplates(result.value);
    });
    return () => {
      active = false;
    };
  }, [user]);

  async function onSave(event: FormEvent) {
    event.preventDefault();
    setBusy("save");
    const result = await saveTemplate(name, design);
    setBusy(null);
    if (!result.ok) return toast(result.error, "error");
    setName("");
    toast(
      result.droppedLogo
        ? `Saved “${result.value.name}”. The logo was too large to store and was left out.`
        : `Saved “${result.value.name}” to your templates.`,
    );
    await refresh();
  }

  async function onDelete(template: DesignTemplateRow) {
    setBusy(template.id);
    const result = await deleteTemplate(template.id);
    setBusy(null);
    if (!result.ok) return toast(result.error, "error");
    toast(`Deleted “${template.name}”`);
    setTemplates((list) => list?.filter((t) => t.id !== template.id) ?? null);
  }

  if (loading) return null;
  if (!user) {
    return (
      <p className="rounded-control bg-surface-2 px-3.5 py-3 text-sm text-fg-muted">
        <Link
          href="/login?next=/"
          className="font-semibold text-link underline-offset-4 hover:underline"
        >
          Sign in
        </Link>{" "}
        to save your own templates and use them on any device. It’s free.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <span id="my-templates" className="text-sm font-medium text-fg">
        My templates
      </span>
      {templates === null ? (
        <p className="text-sm text-fg-muted">Loading…</p>
      ) : templates.length === 0 ? (
        <p className="text-sm text-fg-muted">Save the current design to reuse it on any device.</p>
      ) : (
        <ul aria-labelledby="my-templates" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {templates.map((template) => {
            const saved = sanitizeDesign(template.design);
            return (
              <li
                key={template.id}
                className="relative flex flex-col gap-1.5 rounded-control border border-border bg-surface p-1.5"
              >
                <button
                  type="button"
                  onClick={() => dispatch({ type: "applyDesign", design: saved })}
                  className="flex flex-col gap-1.5 rounded-md text-left text-xs font-medium text-fg focus-ring"
                >
                  <StylePreview design={saved} />
                  <span className="truncate px-0.5">{template.name}</span>
                </button>
                <IconButton
                  label={`Delete ${template.name}`}
                  variant="ghost"
                  size="icon-sm"
                  className="absolute top-2 right-2 bg-surface/90"
                  disabled={busy === template.id}
                  onClick={() => void onDelete(template)}
                >
                  <Trash2 aria-hidden />
                </IconButton>
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={onSave} className="flex gap-2">
        <TextInput
          aria-label="Template name"
          placeholder="Template name, e.g. Brand"
          value={name}
          maxLength={60}
          onChange={(event) => setName(event.target.value)}
        />
        <Button type="submit" variant="outline" disabled={busy !== null} className="shrink-0">
          {busy === "save" && <Loader2 aria-hidden className="animate-spin" />}
          Save design
        </Button>
      </form>
    </div>
  );
}
