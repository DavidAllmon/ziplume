"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";

import { PageHeader } from "@/components/app/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { designForStorage, updateCodeWithSettings } from "@/features/codes/api";
import { useInBrowser } from "@/lib/useInBrowser";
import type { FolderRow, QrCodeRow } from "@/types/supabase";

import { EditorLayout } from "./EditorLayout";
import { fromSavedCode } from "./load";
import type { CreateState } from "./state";
import { hasChanges, toCodePatch } from "./submit";
import { useCodeDraft } from "./useCodeDraft";
import { useUnsavedChangesGuard } from "./useUnsavedChangesGuard";

export interface EditCodePageProps {
  code: QrCodeRow;
  /** The code owner's folders. */
  folders: FolderRow[];
  /** A teammate's code: new page files go to their space. Null for your own code. */
  mediaOwner: string | null;
  /** The code's page: where Back and a finished save go. */
  codeHref: string;
}

/** The Create editor, opened on a saved code. */
export function EditCodePage(props: EditCodePageProps) {
  // Start and end times show in the viewer's time zone, which the server can't know, so the
  // form is built in the browser.
  const inBrowser = useInBrowser();
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href={props.codeHref}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-link underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" /> Back to {props.code.name}
        </Link>
        <PageHeader
          title="Edit code"
          description="Change anything below, then save. The preview updates as you go."
        />
      </div>
      {inBrowser ? (
        <EditForm {...props} />
      ) : (
        <p aria-busy="true" className="text-sm text-fg-muted">
          Opening the editor…
        </p>
      )}
    </div>
  );
}

function EditForm({ code, folders, mediaOwner, codeHref }: EditCodePageProps) {
  const router = useRouter();
  const toast = useToast();
  const initial = useMemo(() => fromSavedCode(code), [code]);
  const draft = useCodeDraft(
    { type: initial.code.activeType, folderId: initial.folderId },
    { initial, requireSlug: Boolean(code.slug) },
  );
  const { state, dispatch } = draft;
  const [removePassword, setRemovePassword] = useState(false);
  const [saving, setSaving] = useState(false);
  /** Why the last save failed, shown until the form changes. */
  const [failure, setFailure] = useState<{ message: string; state: CreateState } | null>(null);
  /** Set the moment Save is pressed, so a second press can't start another save. */
  const inFlight = useRef(false);

  const name = state.code.name.trim() || draft.defaultName;
  const changes = toCodePatch(initial, state, { name, removePassword });
  const dirty = hasChanges(changes);
  useUnsavedChangesGuard(dirty && !saving);

  async function save() {
    if (inFlight.current || draft.blocker || !dirty) return;
    inFlight.current = true;
    setSaving(true);
    const result = await updateCodeWithSettings(code.id, changes.patch, changes.password);
    if (!result.ok) {
      inFlight.current = false;
      setSaving(false);
      setFailure({ message: result.error, state });
      toast(result.error, "error");
      return;
    }
    const droppedLogo = changes.patch.design && designForStorage(changes.patch.design).droppedLogo;
    toast(
      droppedLogo
        ? "Changes saved. The logo was too large to store and was left out."
        : "Changes saved",
    );
    // Replace (not push) so Back skips the editor, and refresh so Next's back/forward cache
    // can't bring back the editor as it was before this save.
    router.replace(codeHref);
    router.refresh();
  }

  function discard() {
    dispatch({ type: "restore", state: initial });
    setRemovePassword(false);
    setFailure(null);
  }

  return (
    <EditorLayout
      draft={draft}
      folders={folders}
      mediaOwner={mediaOwner}
      controls={{
        mode: "edit",
        submitting: saving,
        onSubmit: () => void save(),
        error: failure?.state === state ? failure.message : null,
        dirty,
        onDiscard: discard,
      }}
      saved={{
        slug: code.slug,
        hasPassword: code.has_password,
        removePassword,
        onRemovePassword: setRemovePassword,
      }}
    />
  );
}
