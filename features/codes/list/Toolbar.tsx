"use client";

import { LayoutGrid, List, Search } from "lucide-react";

import { Select, TextInput } from "@/components/ui/inputs";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { codeTypeInfo } from "@/lib/qr/code-types";
import type { CodeTypeId } from "@/lib/qr/types";

import { SORTS, STATUS_FILTERS, type ListFilters, type SortKey } from "./filters";
import type { ListView } from "./useListView";

const VIEWS = [
  { value: "list", label: <List aria-hidden />, ariaLabel: "List view" },
  { value: "grid", label: <LayoutGrid aria-hidden />, ariaLabel: "Grid view" },
] as const;

/** Search, Type, Status, sort and the list/grid switch. */
export function Toolbar({
  filters,
  onFilters,
  sort,
  onSort,
  view,
  onView,
  types,
}: {
  filters: ListFilters;
  onFilters: (filters: ListFilters) => void;
  sort: SortKey;
  onSort: (sort: SortKey) => void;
  view: ListView;
  onView: (view: ListView) => void;
  types: CodeTypeId[];
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Search codes</span>
        <Search
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-muted"
        />
        <TextInput
          type="search"
          placeholder="Search by name, link or content"
          className="pl-9"
          value={filters.query}
          onChange={(e) => onFilters({ ...filters, query: e.target.value })}
        />
      </label>
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-center">
        <label className="sm:w-40">
          <span className="sr-only">Type</span>
          <Select
            aria-label="Type"
            value={filters.type}
            onChange={(e) => onFilters({ ...filters, type: e.target.value as ListFilters["type"] })}
          >
            <option value="all">All types</option>
            {types.map((type) => (
              <option key={type} value={type}>
                {codeTypeInfo(type).label}
              </option>
            ))}
          </Select>
        </label>
        <label className="sm:w-40">
          <span className="sr-only">Status</span>
          <Select
            aria-label="Status"
            value={filters.status}
            onChange={(e) =>
              onFilters({ ...filters, status: e.target.value as ListFilters["status"] })
            }
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="sm:w-44">
          <span className="sr-only">Sort</span>
          <Select
            aria-label="Sort"
            value={sort}
            onChange={(e) => onSort(e.target.value as SortKey)}
          >
            {SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
        <SegmentedControl
          aria-label="Layout"
          value={view}
          onChange={onView}
          options={VIEWS}
          className="w-28"
        />
      </div>
    </div>
  );
}
