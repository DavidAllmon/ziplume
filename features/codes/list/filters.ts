import { codeState, codeSummary, codeType } from "@/features/dashboard/codeRender";
import type { CodeTypeId } from "@/lib/qr/types";
import type { QrCodeRow } from "@/types/supabase";

/** One status per code in the list (spec §5 status words). */
export type ListStatus = "active" | "paused" | "scheduled" | "expired" | "static";
export type StatusFilter = "all" | ListStatus;
export type SortKey = "newest" | "updated" | "scans" | "name";
export type TypeFilter = "all" | CodeTypeId;

export interface ListFilters {
  query: string;
  type: TypeFilter;
  status: StatusFilter;
}

export const NO_FILTERS: ListFilters = { query: "", type: "all", status: "all" };

export const STATUS_LABELS: Record<ListStatus, string> = {
  active: "Active",
  paused: "Paused",
  scheduled: "Scheduled",
  expired: "Expired",
  static: "Static",
};

export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All statuses" },
  ...(Object.keys(STATUS_LABELS) as ListStatus[]).map((value) => ({
    value,
    label: STATUS_LABELS[value],
  })),
];

export const SORTS: { value: SortKey; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "updated", label: "Recently updated" },
  { value: "scans", label: "Most scans" },
  { value: "name", label: "Name" },
];

/** Trackable codes are Active, Paused, Scheduled or Expired; everything else is Static. */
export function listStatus(
  code: Pick<QrCodeRow, "is_dynamic" | "status" | "active_from" | "active_until">,
  now = Date.now(),
): ListStatus {
  return code.is_dynamic ? codeState(code, now) : "static";
}

/** Search (name, content or short link), then the Type and Status filters. */
export function filterCodes(codes: QrCodeRow[], filters: ListFilters, now = Date.now()) {
  const query = filters.query.trim().toLowerCase();
  return codes.filter((code) => {
    if (filters.type !== "all" && codeType(code) !== filters.type) return false;
    if (filters.status !== "all" && listStatus(code, now) !== filters.status) return false;
    if (!query) return true;
    return [code.name, codeSummary(code), code.slug ?? ""].some((field) =>
      field.toLowerCase().includes(query),
    );
  });
}

/** A sorted copy. "Most scans" uses the last 30 days' scans; ties fall back to recently updated. */
export function sortCodes(codes: QrCodeRow[], sort: SortKey, recentScans: Record<string, number>) {
  const byUpdated = (a: QrCodeRow, b: QrCodeRow) => b.updated_at.localeCompare(a.updated_at);
  const copy = [...codes];
  switch (sort) {
    case "name":
      return copy.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    case "scans":
      return copy.sort(
        (a, b) => (recentScans[b.id] ?? 0) - (recentScans[a.id] ?? 0) || byUpdated(a, b),
      );
    case "updated":
      return copy.sort(byUpdated);
    default:
      return copy.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

/** The types present in a list, in first-seen order, for the Type filter. */
export function typesIn(codes: QrCodeRow[]): CodeTypeId[] {
  return [...new Set(codes.map(codeType))];
}
