"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

import { bulkCreateHref, newCodeHref } from "@/components/app/nav";
import { PageHeader } from "@/components/app/PageHeader";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { TextInput } from "@/components/ui/inputs";
import { TYPE_ICONS } from "@/features/generator/content/registry";
import { LookSketch } from "@/features/pages/look/LookSketch";
import { cn } from "@/lib/cn";
import { themeLook, TYPE_THEME } from "@/lib/pages/look";
import { isPageType, type CodeTypeId, type PageTypeId } from "@/lib/qr/types";

import { clearDraft, parseDraft, rawDraft } from "../draft";
import { galleryDescription, galleryGroups, galleryLabel } from "./gallery";

/** Other tabs can save or clear the draft. */
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/** The sketch's header, as the type draws it (spec 6.4). */
const sketchHeader = (id: PageTypeId) =>
  id === "coupon" || id === "event"
    ? "banner"
    : id === "pdf" || id === "images" || id === "video"
      ? "none"
      : "classic";

const tileClass =
  "flex h-full min-h-11 flex-col gap-1 rounded-control border border-border bg-surface p-3 text-left transition-colors focus-ring hover:border-field-border hover:bg-surface-2";

/** The first step of Create: pick what the code opens. Each type opens its own editor. */
export function TypeGallery({ userId, folderId }: { userId: string; folderId: string | null }) {
  const [query, setQuery] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const raw = useSyncExternalStore(
    subscribe,
    () => rawDraft(userId),
    () => null,
  );
  const draft = useMemo(() => (dismissed ? null : parseDraft(raw)), [dismissed, raw]);
  const groups = galleryGroups(query);
  const href = (type: CodeTypeId) => newCodeHref({ type, folderId, ownerId: null });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="What do you want to make?"
        description="Pick what the code opens. Everything else can change later."
      />
      {draft && (
        <div
          role="region"
          aria-label="Unfinished code"
          className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-surface-2 px-4 py-3 text-sm"
        >
          <span className="text-fg">
            You have an unfinished{" "}
            <strong className="font-semibold">{galleryLabel(draft.state.code.activeType)}</strong>{" "}
            on this device.
          </span>
          <span className="flex gap-2">
            <Link
              href={`${href(draft.state.code.activeType)}&resume=1`}
              className={buttonClasses("primary", "sm")}
            >
              Continue
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearDraft(userId);
                setDismissed(true);
              }}
            >
              Discard
            </Button>
          </span>
        </div>
      )}
      <div className="max-w-sm">
        <Field label="Search types">
          {(control) => (
            <TextInput
              {...control}
              type="search"
              placeholder="Wi-Fi, menu, PDF…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          )}
        </Field>
      </div>
      {groups.length === 0 && (
        <p className="text-sm text-fg-muted">No types match “{query.trim()}”.</p>
      )}
      {groups.map((group) => (
        <section
          key={group.id}
          aria-labelledby={`gallery-${group.id}`}
          className="flex flex-col gap-3"
        >
          <div className={cn(group.id === "link" && "sr-only")}>
            <h2 id={`gallery-${group.id}`} className="font-display text-lg font-bold text-fg">
              {group.title}
            </h2>
            {group.note && <p className="text-sm text-fg-muted">{group.note}</p>}
          </div>
          <ul
            className={cn(
              "grid gap-2",
              group.id !== "link" && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
            )}
          >
            {group.ids.map((id) => {
              const Icon = TYPE_ICONS[id];
              return (
                <li key={id}>
                  <Link href={href(id)} className={tileClass}>
                    {isPageType(id) && (
                      // A tiny drawing of the page, on its type's own theme.
                      <LookSketch
                        look={themeLook(TYPE_THEME[id], id)}
                        header={sketchHeader(id)}
                        className="mb-1 h-20 w-full"
                      />
                    )}
                    <span className="flex items-center gap-2 text-sm font-semibold text-fg">
                      <Icon aria-hidden className="size-4 shrink-0" />
                      {galleryLabel(id)}
                    </span>
                    <span className="text-[13px] text-fg-muted">{galleryDescription(id)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <p className="text-sm text-fg-muted">
        Need lots of codes?{" "}
        <Link
          href={bulkCreateHref({ folderId, ownerId: null })}
          className="font-medium text-link underline-offset-4 hover:underline"
        >
          Make many at once
        </Link>
      </p>
    </div>
  );
}
