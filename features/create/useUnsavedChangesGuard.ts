"use client";

import { useEffect, useRef } from "react";

export const LEAVE_MESSAGE = "Leave without saving? Your changes will be lost.";

/** Marks the copy of this page that Back lands on first. */
const COPY_KEY = "__unsavedChangesCopy";

const isCopy = (state: unknown) =>
  typeof state === "object" &&
  state !== null &&
  (state as Record<string, unknown>)[COPY_KEY] === true;

/**
 * While `active`, asks before the page is left: in-app links, Back and Forward, closing the tab
 * and reloading. Back works by keeping one copy of this page on the history stack: Back lands on
 * the copy's original first, which asks; with nothing unsaved it just keeps going, so Back is
 * never a dead press.
 */
export function useUnsavedChangesGuard(active: boolean): void {
  const activeRef = useRef(active);
  /** Whether the history entry showing now is this page's copy. */
  const onCopy = useRef(false);
  /** The person chose to leave: stop asking. */
  const leaving = useRef(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  // Back and Forward, for as long as the page is open.
  useEffect(() => {
    onCopy.current = isCopy(window.history.state);
    const page = window.location.pathname + window.location.search;
    const onPopState = (event: PopStateEvent) => {
      if (leaving.current) return;
      if (isCopy(event.state)) {
        onCopy.current = true;
        return;
      }
      const leftCopy = onCopy.current;
      onCopy.current = false;
      if (!leftCopy || window.location.pathname + window.location.search !== page) return;
      // Back from the copy landed on this page's own entry.
      if (!activeRef.current) {
        window.history.back();
      } else if (window.confirm(LEAVE_MESSAGE)) {
        leaving.current = true;
        window.history.back();
      } else {
        window.history.forward();
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    if (!active) return;

    // The first unsaved change adds the copy; it stays while the page is open.
    if (!isCopy(window.history.state)) {
      window.history.pushState(
        { ...(window.history.state ?? {}), [COPY_KEY]: true },
        "",
        window.location.href,
      );
    }
    onCopy.current = true;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (leaving.current) return;
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

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [active]);
}
