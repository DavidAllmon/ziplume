import type { EditorTab } from "./tabs";

const FIRST_FIELD =
  "input:not([type='hidden']):not(:disabled), textarea:not(:disabled), select:not(:disabled)";

/** Brings a field into view and focuses it: the input marked `data-field`, or else the tab's first
 * usable field. Quietly does nothing when the tab isn't there. */
export function focusField(root: HTMLElement | null, tab: EditorTab, field: string | null): void {
  const panel = root?.querySelector<HTMLElement>(`[data-editor-panel="${tab}"]`);
  if (!panel) return;
  const target =
    (field ? panel.querySelector<HTMLElement>(`[data-field="${field}"]`) : null) ??
    panel.querySelector<HTMLElement>(FIRST_FIELD);
  if (!target) return;
  target.scrollIntoView?.({ block: "center" });
  target.focus({ preventScroll: true });
}
