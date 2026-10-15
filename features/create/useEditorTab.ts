"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import { isEditorTab, type EditorTab } from "./tabs";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

const tabInAddress = (): EditorTab | null => {
  const value = window.location.hash.slice(1);
  return isEditorTab(value) ? value : null;
};

/** The open editor tab, kept in the address (#content, #look, #qr, #settings) so a reload or a
 * shared link opens the same tab. A tab this type doesn't have opens Content. */
export function useEditorTab(tabs: readonly EditorTab[]): [EditorTab, (tab: EditorTab) => void] {
  const fromAddress = useSyncExternalStore(subscribe, tabInAddress, () => null);
  const [chosen, setChosen] = useState<EditorTab | null>(null);
  const wanted = chosen ?? fromAddress ?? "content";
  const tab = tabs.includes(wanted) ? wanted : "content";
  const select = useCallback((next: EditorTab) => {
    setChosen(next);
    // Replace, not push: switching tabs isn't a step Back should undo. Keep history.state, which
    // holds Next's router state and the unsaved-changes guard's marker.
    window.history.replaceState(window.history.state, "", `#${next}`);
  }, []);
  return [tab, select];
}
