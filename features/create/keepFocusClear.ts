import { useEffect, type RefObject } from "react";

/**
 * Keeps a field that gets focus clear of the editor's pinned top bar and, on phones, its pinned
 * tabs. Browsers that honor scroll-padding-top when focus scrolls a field into view do this on
 * their own; WebKit doesn't, so a field could land under the bars. Runs a frame after focus, once
 * the browser's own scrolling is done.
 */
export function useKeepFocusClear(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const pinnedBottom = () =>
      [element.querySelector("[data-editor-bar]"), element.querySelector("[role='tablist']")]
        .filter(
          (bar): bar is HTMLElement =>
            bar instanceof HTMLElement && getComputedStyle(bar).position === "sticky",
        )
        .reduce((bottom, bar) => Math.max(bottom, bar.getBoundingClientRect().bottom), 0);
    const onFocus = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.closest("[data-editor-bar], [role='tablist']")) return;
      requestAnimationFrame(() => {
        const covered = pinnedBottom();
        const top = target.getBoundingClientRect().top;
        if (top < covered) window.scrollBy({ top: top - covered - 8 });
      });
    };
    element.addEventListener("focusin", onFocus);
    return () => element.removeEventListener("focusin", onFocus);
  }, [root]);
}
