/** The editor's tabs, in order. Look is for hosted pages only. */
export const EDITOR_TABS = ["content", "look", "qr", "settings"] as const;
export type EditorTab = (typeof EDITOR_TABS)[number];

export const TAB_LABELS: Record<EditorTab, string> = {
  content: "Content",
  look: "Look",
  qr: "QR code",
  settings: "Settings",
};

export const isEditorTab = (value: string): value is EditorTab =>
  (EDITOR_TABS as readonly string[]).includes(value);

/** The tabs a type has: only hosted pages have a Look. */
export const tabsFor = (hosted: boolean): EditorTab[] =>
  hosted ? [...EDITOR_TABS] : EDITOR_TABS.filter((tab) => tab !== "look");

/** What stops a code from being created yet, and where to fix it. */
export interface Problem {
  message: string;
  tab: EditorTab;
  /** The `data-field` of the input to focus; null focuses the tab's first field. */
  field: string | null;
}
