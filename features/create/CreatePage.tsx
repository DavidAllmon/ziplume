"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";

import { newCodeHref } from "@/components/app/nav";
import { useToast } from "@/components/ui/Toast";
import { createCodeWithSettings, designForStorage } from "@/features/codes/api";
import type { CodeTypeId } from "@/lib/qr/types";
import { useInBrowser } from "@/lib/useInBrowser";
import type { FolderRow } from "@/types/supabase";

import { parseDraft, rawDraft } from "./draft";
import { DraftBanner } from "./DraftBanner";
import { EditorLayout } from "./EditorLayout";
import type { CreateState } from "./state";
import { toNewCode } from "./submit";
import { useCodeDraft } from "./useCodeDraft";
import { useDraftStorage } from "./useDraftStorage";

export interface CreatePageProps {
  userId: string;
  folders: FolderRow[];
  initialType: CodeTypeId;
  initialFolderId: string | null;
  /** Opened from the gallery's Continue: start from the unfinished code. */
  resume?: boolean;
}

/** A saved folder that's gone (or in another workspace) falls back to the page's folder. */
const inFolders = (
  saved: CreateState,
  folders: FolderRow[],
  fallback: string | null,
): CreateState => ({
  ...saved,
  folderId: folders.some((folder) => folder.id === saved.folderId) ? saved.folderId : fallback,
});

/** One page: sections on the left in any order, the live preview and Create on the right. */
export function CreatePage(props: CreatePageProps) {
  // A draft lives in this browser only, so Continue opens it once the page is in the browser.
  const inBrowser = useInBrowser();
  if (props.resume && !inBrowser) {
    return (
      <p aria-busy="true" className="text-sm text-fg-muted">
        Opening your unfinished code…
      </p>
    );
  }
  return <CreateEditor {...props} />;
}

function CreateEditor({
  userId,
  folders,
  initialType,
  initialFolderId,
  resume = false,
}: CreatePageProps) {
  const router = useRouter();
  const toast = useToast();
  const defaults = useMemo(
    () => ({ type: initialType, folderId: initialFolderId }),
    [initialType, initialFolderId],
  );
  // Continue from the gallery: start from the saved draft, read once.
  const [resumed] = useState(() => {
    const saved = resume ? parseDraft(rawDraft(userId)) : null;
    return saved ? inFolders(saved.state, folders, initialFolderId) : null;
  });
  const draft = useCodeDraft(defaults, resumed ? { initial: resumed } : undefined);
  const { state, dispatch } = draft;
  const restore = useCallback(
    (saved: CreateState) =>
      dispatch({ type: "restore", state: inFolders(saved, folders, defaults.folderId) }),
    [dispatch, folders, defaults.folderId],
  );
  const drafts = useDraftStorage({
    userId,
    state,
    defaults,
    onRestore: restore,
    startOwned: resumed !== null,
  });
  const [creating, setCreating] = useState(false);
  /** Why the last Create failed, shown until the page changes. */
  const [failure, setFailure] = useState<{ message: string; state: CreateState } | null>(null);
  /** Set the moment Create is pressed, so a second press can't start another save. */
  const inFlight = useRef(false);

  async function create() {
    if (inFlight.current || draft.blocker) return;
    inFlight.current = true;
    setCreating(true);
    const name = state.code.name.trim() || draft.defaultName;
    const { input, settings } = toNewCode(state, null, name);
    const result = await createCodeWithSettings(input, settings);
    if (!result.ok) {
      inFlight.current = false;
      setCreating(false);
      setFailure({ message: result.error, state });
      toast(result.error, "error");
      return;
    }
    drafts.finished();
    toast(
      designForStorage(state.code.design).droppedLogo
        ? "Code created. The logo was too large to store and was left out."
        : "Code created",
    );
    router.push(`/codes/${result.value.id}#download`);
  }

  const controls = {
    mode: "create" as const,
    submitting: creating,
    onSubmit: () => void create(),
    error: failure?.state === state ? failure.message : null,
  };

  return (
    <div className="flex flex-col gap-6">
      {drafts.offer && (
        <DraftBanner
          savedAt={drafts.offer.savedAt}
          onResume={drafts.resume}
          onDiscard={drafts.discard}
        />
      )}
      <EditorLayout
        draft={draft}
        folders={folders}
        mediaOwner={null}
        controls={controls}
        back={{
          href: newCodeHref({ folderId: initialFolderId, ownerId: null }),
          label: "Change type",
        }}
      />
    </div>
  );
}
