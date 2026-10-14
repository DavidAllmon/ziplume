"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";

import { PageHeader } from "@/components/app/PageHeader";
import { withWorkspace } from "@/components/app/nav";
import { Card, CardHeader } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";
import { createCodeWithSettings } from "@/features/codes/api";
import type { ContentEditor } from "@/features/generator/content/types";
import type { CodeTypeId } from "@/lib/qr/types";
import type { FolderRow } from "@/types/supabase";

import { CreateMobileBar } from "./CreateMobileBar";
import { DraftBanner } from "./DraftBanner";
import { PreviewColumn } from "./PreviewColumn";
import { ContentSection } from "./sections/ContentSection";
import { DesignSection } from "./sections/DesignSection";
import { NameFolderSection } from "./sections/NameFolderSection";
import { SettingsSection } from "./sections/SettingsSection";
import { TypeSection } from "./sections/TypeSection";
import type { CreateState } from "./state";
import { toNewCode } from "./submit";
import { useCodeDraft } from "./useCodeDraft";
import { useDraftStorage } from "./useDraftStorage";

export interface CreatePageProps {
  userId: string;
  /** The team workspace to create in (its owner's id); null for your own codes. */
  teamId: string | null;
  /** The team owner's name for the header; null for your own codes. */
  workspaceLabel: string | null;
  folders: FolderRow[];
  initialType: CodeTypeId;
  initialFolderId: string | null;
}

/** One page: sections on the left in any order, the live preview and Create on the right. */
export function CreatePage({
  userId,
  teamId,
  workspaceLabel,
  folders,
  initialType,
  initialFolderId,
}: CreatePageProps) {
  const router = useRouter();
  const toast = useToast();
  const defaults = useMemo(
    () => ({ type: initialType, folderId: initialFolderId }),
    [initialType, initialFolderId],
  );
  const draft = useCodeDraft(defaults);
  const { state, dispatch, codeAction } = draft;
  const restore = useCallback(
    (saved: CreateState) =>
      dispatch({
        type: "restore",
        state: {
          ...saved,
          // A folder that's gone (or in another workspace) falls back to this page's folder.
          folderId: folders.some((folder) => folder.id === saved.folderId)
            ? saved.folderId
            : defaults.folderId,
        },
      }),
    [dispatch, folders, defaults.folderId],
  );
  const drafts = useDraftStorage({ userId, state, defaults, onRestore: restore });
  const [creating, setCreating] = useState(false);
  /** Set the moment Create is pressed, so a second press can't start another save. */
  const inFlight = useRef(false);

  const editor: ContentEditor = {
    state: state.code,
    setField: draft.setField,
    setPage: draft.setPage,
    pageErrors: draft.pageErrors,
    workspace: teamId ? { ownerId: teamId } : null,
  };

  async function create() {
    if (inFlight.current || draft.blocker) return;
    inFlight.current = true;
    setCreating(true);
    const name = state.code.name.trim() || draft.defaultName;
    const { input, settings } = toNewCode(state, teamId, name);
    const result = await createCodeWithSettings(input, settings);
    if (!result.ok) {
      inFlight.current = false;
      setCreating(false);
      toast(result.error, "error");
      return;
    }
    drafts.finished();
    toast("Code created");
    router.push(`${withWorkspace(`/codes/${result.value.id}`, teamId)}#download`);
  }

  const controls = { creating, onCreate: () => void create() };

  return (
    <div className="flex flex-col gap-6 pb-24 md:pb-0">
      <PageHeader
        title="Create a code"
        description={
          workspaceLabel
            ? `Saving to ${workspaceLabel}’s codes`
            : "Fill in the sections in any order. The preview updates as you go."
        }
      />
      {drafts.offer && (
        <DraftBanner
          savedAt={drafts.offer.savedAt}
          onResume={drafts.resume}
          onDiscard={drafts.discard}
        />
      )}
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_18.5rem] lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <TypeSection
            value={state.code.activeType}
            onChange={(activeType) => codeAction({ type: "setActiveType", activeType })}
          />
          <ContentSection
            editor={editor}
            onTypeChange={(activeType) => codeAction({ type: "setActiveType", activeType })}
          />
          <DesignSection
            design={state.code.design}
            dispatch={codeAction}
            onResetToStyle={() => dispatch({ type: "resetToStyle" })}
          />
          <SettingsSection
            type={state.code.activeType}
            settings={state.settings}
            onChange={(patch) => dispatch({ type: "settings", patch })}
          />
          <NameFolderSection
            name={state.code.name}
            placeholder={draft.defaultName}
            onName={(name) => codeAction({ type: "setName", name })}
            folderId={state.folderId}
            folders={folders}
            onFolder={(folderId) => dispatch({ type: "setFolder", folderId })}
          />
        </div>
        <aside aria-labelledby="preview-heading" className="hidden md:sticky md:top-6 md:block">
          <Card>
            <CardHeader id="preview-heading" title="Preview" />
            <div className="px-5 pt-4 pb-6">
              <PreviewColumn draft={draft} {...controls} />
            </div>
          </Card>
        </aside>
      </div>
      <CreateMobileBar draft={draft} {...controls} />
    </div>
  );
}
