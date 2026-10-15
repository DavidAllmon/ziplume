"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { clearDraft, isBlank, parseDraft, rawDraft, saveDraft, type StoredDraft } from "./draft";
import type { CreateDefaults, CreateState } from "./state";

const DRAFT_DELAY_MS = 500;

/** Other tabs can save or clear the draft; this tab's own changes show on its next render. */
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/**
 * Keeps an unfinished code in this browser and offers it back once. Nothing is read on the
 * server, so the page renders the same there and while hydrating. While an older draft is on
 * offer, nothing is written, so it can't be lost by accident: it's replaced only after Resume
 * or Discard.
 */
export function useDraftStorage({
  userId,
  state,
  defaults,
  onRestore,
  startOwned = false,
}: {
  userId: string;
  state: CreateState;
  defaults: CreateDefaults;
  onRestore: (state: CreateState) => void;
  /** The page already opened the draft (Continue from the gallery): don't offer it again. */
  startOwned?: boolean;
}) {
  const raw = useSyncExternalStore(
    subscribe,
    () => rawDraft(userId),
    () => null,
  );
  /** This page owns the draft slot: it saved a draft, or the person chose Resume or Discard. */
  const [owned, setOwned] = useState(startOwned);
  /** The code was created; stop saving. */
  const [done, setDone] = useState(false);
  const offer: StoredDraft | null = useMemo(
    () => (owned || done ? null : parseDraft(raw)),
    [owned, done, raw],
  );

  useEffect(() => {
    if (offer || done) return;
    const timer = window.setTimeout(() => {
      if (isBlank(state, defaults)) clearDraft(userId);
      else saveDraft(userId, state);
      setOwned(true);
    }, DRAFT_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [offer, done, state, defaults, userId]);

  const resume = useCallback(() => {
    if (offer) onRestore(offer.state);
    setOwned(true);
  }, [offer, onRestore]);

  const discard = useCallback(() => {
    clearDraft(userId);
    setOwned(true);
  }, [userId]);

  /** After creating: drop this page's draft. An older draft still on offer stays. */
  const finished = useCallback(() => {
    if (!offer) clearDraft(userId);
    setDone(true);
  }, [offer, userId]);

  return { offer, resume, discard, finished };
}
