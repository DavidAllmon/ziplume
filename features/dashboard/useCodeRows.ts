"use client";

import { useEffect, useState } from "react";

import { useToast } from "@/components/ui/Toast";
import { getBrowserSupabase } from "@/lib/supabase/client";

type Table = "contact_shares" | "coupon_redemptions" | "event_rsvps";

/** The most a list loads, and its CSV holds: the newest (ruling 10). */
export const ROW_LIMIT = 1000;

/**
 * What visitors sent to one code, newest first: the latest 1,000, the exact total, and a way to
 * delete one (the database lets only owners and editors).
 */
export function useCodeRows<T extends { id: number }>(
  table: Table,
  codeId: string,
  columns: string,
) {
  const toast = useToast();
  const [rows, setRows] = useState<T[] | null>(null);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    let active = true;
    supabase
      .from(table)
      .select(columns, { count: "exact" })
      .eq("code_id", codeId)
      .order("created_at", { ascending: false })
      .limit(ROW_LIMIT)
      .then(({ data, error, count }) => {
        if (!active) return;
        if (error || !data) return setFailed(true);
        setRows(data as unknown as T[]);
        setTotal(count ?? data.length);
      });
    return () => {
      active = false;
    };
  }, [table, codeId, columns]);

  async function remove(id: number) {
    const supabase = getBrowserSupabase();
    if (!supabase) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast("That couldn't be deleted.", "error");
    setRows((list) => list?.filter((r) => r.id !== id) ?? null);
    setTotal((n) => Math.max(n - 1, 0));
  }

  return { rows, total, failed, remove };
}
