"use client";

import { ArrowLeft, BarChart3, ExternalLink, Palette, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import { Button, buttonClasses } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/inputs";
import { Section } from "@/components/ui/Section";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import { deleteCode, updateCode } from "@/features/codes/api";
import { ExportPanel } from "@/features/generator/export/ExportPanel";
import { QrTile } from "@/features/generator/preview/QrTile";
import { DEFAULT_EXPORT } from "@/features/generator/state/defaults";
import { buildFilename, slugify } from "@/lib/qr/filename";
import { isValidSlug } from "@/lib/dynamic/slug";
import { readUtm, withUtm, type UtmParams } from "@/lib/dynamic/utm";
import { shortLink, shortLinkLabel } from "@/lib/env";
import { normalizeUrl } from "@/lib/qr/normalize";
import { isValidUrl } from "@/lib/qr/validators";
import { isPageType } from "@/lib/qr/types";
import type { QrCodeRow } from "@/types/supabase";

import { codeRenderOptions, codeSummary, codeType, codeTypeLabel } from "./codeRender";
import { CopyButton } from "./CopyButton";
import { FeedbackResponses } from "./FeedbackResponses";
import { formatCount, relativeTime } from "./format";

export function CodeEditor({ code: initial }: { code: QrCodeRow }) {
  const isPage = isPageType(initial.qr_type);
  const router = useRouter();
  const toast = useToast();
  const [code, setCode] = useState(initial);
  const [name, setName] = useState(initial.name);
  const [destination, setDestination] = useState(initial.destination ?? "");
  const [slug, setSlug] = useState(initial.slug ?? "");
  const [utm, setUtm] = useState<UtmParams>(() => readUtm(initial.destination ?? ""));
  const [exportSettings, setExportSettings] = useState(DEFAULT_EXPORT);
  const [saving, setSaving] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const options = useMemo(
    () => codeRenderOptions(code, exportSettings.size),
    [code, exportSettings.size],
  );
  const extension = exportSettings.format === "jpeg" ? "jpg" : exportSettings.format;
  const filename = buildFilename(codeType(code), slugify(code.name), extension);
  const destinationValid = isValidUrl(destination);

  async function save(field: string, patch: Parameters<typeof updateCode>[1], success: string) {
    setSaving(field);
    const result = await updateCode(code.id, patch);
    setSaving(null);
    if (!result.ok) {
      toast(result.error, "error");
      return false;
    }
    setCode(result.value);
    toast(success);
    router.refresh();
    return true;
  }

  function saveName(event: FormEvent) {
    event.preventDefault();
    if (name.trim() && name.trim() !== code.name)
      void save("name", { name: name.trim() }, "Name saved");
  }

  async function saveDestination(event: FormEvent) {
    event.preventDefault();
    const url = normalizeUrl(destination);
    if (
      await save(
        "destination",
        { destination: url, content: { url } },
        "Destination updated. Scans now go to the new link.",
      )
    ) {
      setDestination(url);
    }
  }

  function applyUtm() {
    if (!destinationValid) return;
    setDestination(withUtm(normalizeUrl(destination), utm));
  }

  async function saveSlug(event: FormEvent) {
    event.preventDefault();
    if (slug !== code.slug) await save("slug", { slug }, "Link ending updated");
  }

  async function onDelete() {
    setSaving("delete");
    const result = await deleteCode(code.id);
    setSaving(null);
    if (!result.ok) return toast(result.error, "error");
    toast(`Deleted “${code.name}”`);
    router.replace("/dashboard");
    router.refresh();
  }

  const slugSection = code.slug ? (
    <Section title="Link ending" summary={code.slug}>
      <form onSubmit={saveSlug} className="flex flex-col gap-3">
        <Field
          label="Custom ending"
          hint="3–40 letters, numbers or dashes. Changing it breaks codes you've already printed."
          error={slug && !isValidSlug(slug) ? "Use 3–40 letters, numbers or dashes." : undefined}
        >
          {(control) => (
            <TextInput
              {...control}
              autoCapitalize="characters"
              spellCheck={false}
              value={slug}
              onChange={(e) => setSlug(e.target.value.trim())}
            />
          )}
        </Field>
        <div>
          <Button
            type="submit"
            variant="outline"
            disabled={saving !== null || !isValidSlug(slug) || slug === code.slug}
          >
            {saving === "slug" ? "Saving…" : "Change ending"}
          </Button>
        </div>
      </form>
    </Section>
  ) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href="/dashboard"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-link underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" /> My codes
        </Link>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="truncate font-display text-3xl font-bold tracking-tight text-fg">
              {code.name}
            </h1>
            <p className="mt-1 text-sm text-fg-muted">
              {codeTypeLabel(code)} ·{" "}
              {isPage ? "Hosted page" : code.is_dynamic ? "Dynamic" : "Static"} · Updated{" "}
              {relativeTime(code.updated_at)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {code.is_dynamic && (
              <Link
                href={`/dashboard/codes/${code.id}/analytics`}
                className={buttonClasses(isPage ? "outline" : "primary", "md")}
              >
                <BarChart3 aria-hidden /> Analytics
              </Link>
            )}
            <Link
              href={`/?edit=${code.id}`}
              className={buttonClasses(isPage ? "primary" : "outline", "md")}
            >
              <Palette aria-hidden /> {isPage ? "Edit page & design" : "Edit design"}
            </Link>
          </div>
        </div>
      </div>

      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_20rem] lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {isPage && code.slug && (
            <Card>
              <CardHeader
                title="Hosted page"
                description="Edit the page any time. Printed codes always open the latest version."
              />
              <div className="flex flex-col gap-5 px-5 pt-4 pb-6 sm:px-6">
                <div className="flex flex-wrap items-center gap-2 rounded-control bg-surface-2 px-3.5 py-2.5 text-sm">
                  <span className="text-fg-muted">Short link</span>
                  <span className="font-mono text-fg">{shortLinkLabel(code.slug)}</span>
                  <CopyButton text={shortLink(code.slug)} />
                  <a
                    href={`/p/${code.slug}`}
                    target="_blank"
                    rel="noopener"
                    className="ml-auto inline-flex items-center gap-1 font-medium text-link"
                  >
                    View page <ExternalLink aria-hidden className="size-3.5" />
                  </a>
                </div>
                <Toggle
                  label="Active"
                  description={
                    code.status === "active"
                      ? "Scans open the page."
                      : "Paused: scanners see a “paused” notice and scans aren't counted."
                  }
                  checked={code.status === "active"}
                  onChange={(active) =>
                    void save(
                      "status",
                      { status: active ? "active" : "paused" },
                      active ? "The page is live again" : "Paused",
                    )
                  }
                />
              </div>
              {slugSection}
            </Card>
          )}

          {code.qr_type === "feedback" && <FeedbackResponses codeId={code.id} />}

          {code.is_dynamic && !isPage && code.slug && (
            <Card>
              <CardHeader
                title="Where it points"
                description="Change the destination any time. Printed codes update instantly."
              />
              <div className="flex flex-col gap-5 px-5 pt-4 pb-6 sm:px-6">
                <div className="flex flex-wrap items-center gap-2 rounded-control bg-surface-2 px-3.5 py-2.5 text-sm">
                  <span className="text-fg-muted">Short link</span>
                  <span className="font-mono text-fg">{shortLinkLabel(code.slug)}</span>
                  <CopyButton text={shortLink(code.slug)} />
                  <a
                    href={shortLink(code.slug)}
                    target="_blank"
                    rel="noopener"
                    className="ml-auto inline-flex items-center gap-1 font-medium text-link"
                  >
                    Test <ExternalLink aria-hidden className="size-3.5" />
                  </a>
                </div>
                <form onSubmit={saveDestination} className="flex flex-col gap-3">
                  <Field
                    label="Destination URL"
                    error={
                      destination && !destinationValid
                        ? "Enter a web address, like example.com"
                        : undefined
                    }
                  >
                    {(control) => (
                      <TextInput
                        {...control}
                        type="url"
                        inputMode="url"
                        autoCapitalize="none"
                        spellCheck={false}
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                      />
                    )}
                  </Field>
                  <div>
                    <Button
                      type="submit"
                      disabled={
                        saving !== null ||
                        !destinationValid ||
                        normalizeUrl(destination) === code.destination
                      }
                    >
                      {saving === "destination" ? "Saving…" : "Save destination"}
                    </Button>
                  </div>
                </form>
                <Toggle
                  label="Active"
                  description={
                    code.status === "active"
                      ? "Scans redirect to the destination."
                      : "Paused: scanners see a “paused” page and scans aren't counted."
                  }
                  checked={code.status === "active"}
                  onChange={(active) =>
                    void save(
                      "status",
                      { status: active ? "active" : "paused" },
                      active ? "The code is live again" : "Paused",
                    )
                  }
                />
              </div>
              <Section title="Track campaigns in Google Analytics" summary="UTM tags">
                <p className="text-sm text-fg-muted">
                  Adds utm_ tags to the destination so Google Analytics shows these visits as coming
                  from this code.
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  {(["source", "medium", "campaign"] as const).map((key) => (
                    <Field key={key} label={key[0]!.toUpperCase() + key.slice(1)}>
                      {(control) => (
                        <TextInput
                          {...control}
                          placeholder={
                            { source: "flyer", medium: "qr", campaign: "fall-menu" }[key]
                          }
                          value={utm[key]}
                          onChange={(e) => setUtm({ ...utm, [key]: e.target.value })}
                        />
                      )}
                    </Field>
                  ))}
                </div>
                <div>
                  <Button variant="outline" onClick={applyUtm} disabled={!destinationValid}>
                    Apply to destination
                  </Button>
                </div>
              </Section>
              {slugSection}
            </Card>
          )}

          {!code.is_dynamic && (
            <Card>
              <CardHeader
                title="Content"
                description="Static codes contain their content directly, so printed copies can't change."
              />
              <div className="flex flex-col gap-3 px-5 pt-4 pb-6 sm:px-6">
                <p className="rounded-control bg-surface-2 px-3.5 py-2.5 text-sm break-words text-fg">
                  {codeSummary(code)}
                </p>
                <div>
                  <Link href={`/?edit=${code.id}`} className={buttonClasses("outline", "md")}>
                    Edit content and design
                  </Link>
                </div>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title="Details" />
            <div className="flex flex-col gap-5 px-5 pt-4 pb-6 sm:px-6">
              <form onSubmit={saveName} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Field label="Name" className="flex-1">
                  {(control) => (
                    <TextInput
                      {...control}
                      maxLength={120}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  )}
                </Field>
                <Button
                  type="submit"
                  variant="outline"
                  disabled={saving !== null || !name.trim() || name.trim() === code.name}
                >
                  Save name
                </Button>
              </form>
              {code.is_dynamic && (
                <p className="text-sm text-fg-muted">
                  {formatCount(code.scan_count)} {code.scan_count === 1 ? "scan" : "scans"} · last
                  scanned {relativeTime(code.last_scanned_at).toLowerCase()}
                </p>
              )}
              <div>
                <Button
                  variant="ghost"
                  className="text-danger"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 aria-hidden /> Delete code
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <aside className="md:sticky md:top-20 lg:top-24">
          <Card>
            <CardHeader title="Download" />
            <div className="flex flex-col gap-5 px-5 pt-4 pb-6 sm:px-6">
              <QrTile
                options={options}
                summary={code.name}
                emptyHint=""
                className="mx-auto w-full max-w-[18rem]"
              />
              <ExportPanel
                options={options}
                settings={exportSettings}
                filename={filename}
                blocker={null}
                dispatch={(action) => {
                  if (action.type === "setExport")
                    setExportSettings((s) => ({ ...s, ...action.patch }));
                }}
              />
            </div>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete “${code.name}”?`}
        description={
          code.is_dynamic
            ? "The short link stops working and its scan history is deleted. Printed copies of this code will show “not set up”."
            : "This removes the saved code from your account. Downloaded copies keep working."
        }
        confirmLabel="Delete"
        danger
        pending={saving === "delete"}
        onConfirm={onDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}
