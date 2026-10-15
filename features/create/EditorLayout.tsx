"use client";

import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { useRef, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";

import { Card, CardHeader } from "@/components/ui/Card";
import type { ContentEditor } from "@/features/generator/content/types";
import type { FolderRow } from "@/types/supabase";

import { CreateMobileBar } from "./CreateMobileBar";
import { EditorTopBar } from "./EditorTopBar";
import { focusField } from "./focusField";
import { PreviewColumn, type CreateControls, type PreviewView } from "./PreviewColumn";
import { ContentSection } from "./sections/ContentSection";
import { DesignSection } from "./sections/DesignSection";
import { FolderSection } from "./sections/FolderSection";
import { LookSection } from "./sections/LookSection";
import { SettingsSection, type SavedSettings } from "./sections/SettingsSection";
import { TAB_LABELS, tabsFor, type EditorTab } from "./tabs";
import type { CodeDraft } from "./useCodeDraft";
import { useEditorTab } from "./useEditorTab";

/**
 * The editor Create and Edit share: a top bar with the name and the one button, tabs for the
 * content, the page's look, the QR code and the settings, and the live preview beside them (and
 * in the bar above the bottom tabs on phones).
 */
export function EditorLayout({
  draft,
  folders,
  mediaOwner,
  controls,
  saved,
  back,
}: {
  draft: CodeDraft;
  folders: FolderRow[];
  /** Hosted-page files go to this person's space (a teammate's code); null means your own. */
  mediaOwner: string | null;
  controls: CreateControls;
  /** Edit mode only: what the saved code has, so the sections can lock and explain things. */
  saved?: SavedSettings;
  /** Where the top bar's back arrow goes, and what it's called. */
  back: { href: string; label: string };
}) {
  const { state, dispatch, codeAction, pageType, problem } = draft;
  const editing = controls.mode === "edit";
  const tabs = tabsFor(pageType !== null);
  const [tab, selectTab] = useEditorTab(tabs);
  /** A hosted page's preview follows the tab: the page for Content and Look, the code for QR. */
  const [view, setView] = useState<PreviewView>("page");
  /** After "Show me", page errors show without waiting for each field to be left. */
  const [revealErrors, setRevealErrors] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  function changeTab(next: EditorTab) {
    selectTab(next);
    if (next === "qr") setView("code");
    else if (next === "content" || next === "look") setView("page");
  }

  function showMe() {
    if (!problem) return;
    // Render the tab and the errors first, so the field is there to take focus.
    flushSync(() => {
      changeTab(problem.tab);
      setRevealErrors(true);
    });
    focusField(root.current, problem.tab, problem.field);
  }

  const editor: ContentEditor = {
    state: state.code,
    setField: draft.setField,
    setPage: draft.setPage,
    pageErrors: draft.pageErrors,
    workspace: mediaOwner ? { ownerId: mediaOwner } : null,
    revealErrors,
    pageColorInLook: true,
  };
  const page = pageType ? state.code.pages[pageType] : null;

  const panels: Record<EditorTab, ReactNode> = {
    content: (
      <ContentSection
        editor={editor}
        typeLocked={editing}
        onTypeChange={(activeType) => codeAction({ type: "setActiveType", activeType })}
      />
    ),
    look:
      pageType && page ? (
        <LookSection page={page} onChange={(next) => draft.setPage(pageType, next)} />
      ) : null,
    qr: (
      <DesignSection
        design={state.code.design}
        dispatch={codeAction}
        onResetToStyle={() => dispatch({ type: "resetToStyle" })}
        matchColor={page?.color ?? null}
      />
    ),
    settings: (
      <div className="flex flex-col gap-6">
        <SettingsSection
          type={state.code.activeType}
          settings={state.settings}
          onChange={(patch) => dispatch({ type: "settings", patch })}
          saved={saved}
        />
        <FolderSection
          folderId={state.folderId}
          folders={folders}
          onChange={(folderId) => dispatch({ type: "setFolder", folderId })}
        />
      </div>
    ),
  };

  return (
    <TabGroup
      as="div"
      ref={root}
      selectedIndex={tabs.indexOf(tab)}
      onChange={(index) => changeTab(tabs[index]!)}
      className="flex flex-col gap-5"
    >
      <EditorTopBar
        mode={controls.mode}
        type={state.code.activeType}
        back={back}
        name={state.code.name}
        namePlaceholder={draft.defaultName}
        onName={(name) => codeAction({ type: "setName", name })}
        dirty={controls.dirty ?? false}
        onDiscard={controls.onDiscard}
        submitting={controls.submitting}
        onSubmit={controls.onSubmit}
        problem={problem}
        onShowMe={showMe}
        error={controls.error}
      />
      <TabList
        aria-label="Editor sections"
        className="flex gap-1 overflow-x-auto border-b border-border"
      >
        {tabs.map((id) => (
          <Tab
            key={id}
            className="min-h-11 shrink-0 border-b-2 border-transparent px-3 text-sm font-semibold text-fg-muted focus-ring data-hover:text-fg data-selected:border-fg data-selected:text-fg"
          >
            {TAB_LABELS[id]}
          </Tab>
        ))}
      </TabList>
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_18.5rem] lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
        <TabPanels className="min-w-0">
          {tabs.map((id) => (
            // Kept mounted, so open sections, uploads in progress and fields keep their state.
            <TabPanel key={id} unmount={false} data-editor-panel={id}>
              {panels[id]}
            </TabPanel>
          ))}
        </TabPanels>
        <aside
          aria-labelledby="preview-heading"
          className="hidden md:sticky md:top-[calc(var(--editor-bar-h,8rem)+1rem)] md:block"
        >
          <Card>
            <CardHeader id="preview-heading" title="Preview" />
            <div className="px-5 pt-4 pb-6">
              <PreviewColumn
                draft={draft}
                view={view}
                onViewChange={setView}
                mode={controls.mode}
              />
            </div>
          </Card>
        </aside>
      </div>
      <CreateMobileBar draft={draft} view={view} onViewChange={setView} {...controls} />
    </TabGroup>
  );
}
