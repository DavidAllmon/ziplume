"use client";

import { useEffect } from "react";

export const LEAVE_MESSAGE = "Leave without saving? Your changes will be lost.";

/**
 * While `active`, asks before the page is left: in-app links, Back and Forward, closing the tab
 * and reloading. Back works by keeping one copy of this page on the history stack: Back lands on
 * the copy first, and only goes on if the person says so.
 */
export function useUnsavedChangesGuard(active: boolean): void {
  useEffect(() => {
    if (!active) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;
      const url = new URL(link.href, window.location.href);
      const here = window.location;
      if (
        url.origin === here.origin &&
        url.pathname === here.pathname &&
        url.search === here.search
      )
        return;
      // Next.js links don't navigate a click that's already prevented.
      if (!window.confirm(LEAVE_MESSAGE)) event.preventDefault();
    };

    let leaving = false;
    window.history.pushState(window.history.state, "", window.location.href);
    const onPopState = () => {
      if (leaving) return;
      if (window.confirm(LEAVE_MESSAGE)) {
        leaving = true;
        window.history.back();
      } else {
        window.history.pushState(window.history.state, "", window.location.href);
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
    };
  }, [active]);
}
