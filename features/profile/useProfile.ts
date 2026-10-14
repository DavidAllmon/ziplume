"use client";

import { useEffect, useState } from "react";

import { getBrowserSupabase } from "@/lib/supabase/client";

export interface Profile {
  display_name: string | null;
  avatar_url: string | null;
}

const EVENT = "quickqreate:profile";

/** Tells every useProfile() on the page that the profile changed (a new name or photo). */
export function announceProfile(patch: Partial<Profile>) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: patch }));
}

/** The signed-in user's name and photo, kept current when the account page changes them. */
export function useProfile(userId: string | null): Profile | null {
  const [state, setState] = useState<{ userId: string; profile: Profile } | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase || !userId) return;
    let active = true;
    void supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) setState({ userId, profile: data });
      });
    const onChange = (event: Event) => {
      const patch = (event as CustomEvent<Partial<Profile>>).detail;
      setState((current) =>
        current?.userId === userId
          ? { userId, profile: { ...current.profile, ...patch } }
          : current,
      );
    };
    window.addEventListener(EVENT, onChange);
    return () => {
      active = false;
      window.removeEventListener(EVENT, onChange);
    };
  }, [userId]);

  return state?.userId === userId ? state.profile : null;
}
