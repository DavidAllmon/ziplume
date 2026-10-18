import { csvField } from "@/lib/analytics/shape";
import type { ContactShareRow, CouponUseRow, RsvpRow } from "@/types/supabase";

const table = (header: string[], rows: (string | number | null)[][]) =>
  [header, ...rows].map((row) => row.map((v) => csvField(v)).join(",")).join("\r\n");

export const sharesCsv = (rows: ContactShareRow[]) =>
  table(
    ["received_at", "name", "phone", "email", "note"],
    rows.map((r) => [r.created_at, r.name, r.phone, r.email, r.note]),
  );

export const rsvpsCsv = (rows: RsvpRow[]) =>
  table(
    ["received_at", "name", "email", "guests", "note"],
    rows.map((r) => [r.created_at, r.name, r.email, r.guests, r.note]),
  );

export const usesCsv = (rows: CouponUseRow[]) =>
  table(
    ["used_at"],
    rows.map((r) => [r.created_at]),
  );

/** A CSV as a link a download button can point at. */
export const csvHref = (csv: string) => `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;
