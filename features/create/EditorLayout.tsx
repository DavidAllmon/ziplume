"use client";

import { Card, CardHeader } from "@/components/ui/Card";
import type { ContentEditor } from "@/features/generator/content/types";
import type { FolderRow } from "@/types/supabase";

import { CreateMobileBar } from "./CreateMobileBar";
import { PreviewColumn, type CreateControls } from "./PreviewColumn";
import { ContentSection } from "./sections/ContentSection";
import { DesignSection } from "./sections/DesignSection";
import { NameFolderSection } from "./sections/NameFolderSection";
import { SettingsSection, type SavedSettings } from "./sections/SettingsSection";
import { TypeSection } from "./sections/TypeSection";
import type { CodeDraft } from "./useCodeDraft";

/**
 * The editor Create and Edit share: the sections on the left in any order, the live preview and
 * the one button on the right (and above the bottom tabs on phones).
 */
export function EditorLayout({
  draft,
  folders,
  mediaOwner,
  controls,
  saved,
}: {
  draft: CodeDraft;
  folders: FolderRow[];
  /** Hosted-page files go to this person's space (a teammate's code); null means your own. */
  mediaOwner: string | null;
  controls: CreateControls;
  /** Edit mode only: what the saved code has, so the sections can lock and explain things. */
  saved?: SavedSettings;
}) {
  const { state, dispatch, codeAction } = draft;
  const editing = controls.mode === "edit";
  const editor: ContentEditor = {
    state: state.code,
    setField: draft.setField,
    setPage: draft.setPage,
    pageErrors: draft.pageErrors,
    workspace: mediaOwner ? { ownerId: mediaOwner } : null,
  };

  return (
    <>
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_18.5rem] lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <TypeSection
            value={state.code.activeType}
            locked={editing}
            onChange={(activeType) => codeAction({ type: "setActiveType", activeType })}
          />
          <ContentSection
            editor={editor}
            typeLocked={editing}
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
            saved={saved}
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
    </>
  );
}
