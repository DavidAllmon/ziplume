"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

import { getBrowserSupabase } from "@/lib/supabase/client";

/** The signed-in user in client components; `loading` is true until the session is known. */
export function useSession() {
  const supabase = getBrowserSupabase();
  const [state, setState] = useState<{ user: User | null; loading: boolean }>({
    user: null,
    loading: supabase !== null,
  });

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (active) setState({ user: data.user, loading: false });
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState({ user: session?.user ?? null, loading: false });
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  return state;
}
