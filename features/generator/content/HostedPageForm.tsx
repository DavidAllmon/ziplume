"use client";

import { Check, Loader2 } from "lucide-react";
import Link from "next/link";

import { buttonClasses } from "@/components/ui/Button";
import { useSession } from "@/features/auth/useSession";
import { MediaOwnerContext } from "@/features/pages/editor/MediaOwner";
import { AccentField } from "@/features/pages/editor/fields";
import { LookWarnings } from "@/features/pages/editor/LookWarnings";
import { PageEditor } from "@/features/pages/editor/PageEditor";
import { accountsEnabled } from "@/lib/env";
import { withButtonColor } from "@/lib/pages/look";
import { PAGE_TYPES, type PageContentMap } from "@/lib/pages/types";
import type { PageTypeId } from "@/lib/qr/types";

import type { ContentEditor } from "./types";

const PERKS = [
  "A mobile page hosted for free, with no limits",
  "Edit it any time: printed codes keep working",
  "Scan analytics included",
];

/** Hosted pages need an account (they're stored and served by Ziplume). */
export function HostedPageForm({
  generator,
  type,
}: {
  generator: ContentEditor;
  type: PageTypeId;
}) {
  const { user, loading } = useSession();
  const info = PAGE_TYPES[type];

  if (!accountsEnabled) {
    return (
      <p className="rounded-control bg-surface-2 px-4 py-3 text-sm text-fg-muted">
        Hosted pages aren’t available on this server yet.
      </p>
    );
  }
  if (loading) {
    return (
      <p className="flex items-center gap-2 text-sm text-fg-muted">
        <Loader2 aria-hidden className="size-4 animate-spin" /> Checking your account…
      </p>
    );
  }
  if (!user) {
    return (
      <div className="flex flex-col gap-4 rounded-control border border-border bg-surface-2 p-5">
        <div>
          <h3 className="font-display text-lg font-bold text-fg">
            {info.label} pages need a free account
          </h3>
          <p className="mt-1 text-sm text-fg-muted">{info.description}.</p>
        </div>
        <ul className="flex flex-col gap-1.5 text-sm text-fg">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-start gap-2">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" /> {perk}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Link href="/signup?next=/" className={buttonClasses("primary", "md")}>
            Create free account
          </Link>
          <Link href="/login?next=/" className={buttonClasses("outline", "md")}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  const page = generator.state.pages[type];
  return (
    <MediaOwnerContext value={generator.workspace?.ownerId ?? null}>
      <div className="flex flex-col gap-5">
        <PageEditor
          key={type}
          type={type}
          page={page}
          errors={generator.pageErrors}
          reveal={generator.revealErrors ?? false}
          cards={generator.pageCards ?? false}
          onUpdate={(update) =>
            generator.updatePage(
              type,
              update as (page: PageContentMap[PageTypeId]) => PageContentMap[PageTypeId],
            )
          }
        />
        {/* The Create editor has a Look tab for this; the home page doesn't. */}
        {!generator.pageColorInLook && (
          <div className="border-t border-border pt-5">
            <AccentField
              value={page.look.button.color}
              onChange={(color) => generator.setPage(type, withButtonColor(page, color))}
            />
            <div className="mt-3">
              <LookWarnings look={page.look} />
            </div>
          </div>
        )}
      </div>
    </MediaOwnerContext>
  );
}
