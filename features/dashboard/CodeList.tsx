"use client";

import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { buttonClasses } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { TextInput } from "@/components/ui/inputs";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/inputs";
import { useToast } from "@/components/ui/Toast";
import { deleteCode, duplicateCode, updateCode } from "@/features/codes/api";
import type { QrCodeRow } from "@/types/supabase";

import { CodeCard } from "./CodeCard";
import { codeSummary } from "./codeRender";

type Filter = "all" | "dynamic" | "static" | "paused";
type Sort = "updated" | "scans" | "name";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "dynamic", label: "Dynamic" },
  { value: "static", label: "Static" },
  { value: "paused", label: "Paused" },
] as const satisfies readonly { value: Filter; label: string }[];

export function CodeList({ codes: initialCodes }: { codes: QrCodeRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [codes, setCodes] = useState(initialCodes);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("updated");
  const [toDelete, setToDelete] = useState<QrCodeRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return codes
      .filter((c) => {
        if (filter === "dynamic" && !c.is_dynamic) return false;
        if (filter === "static" && c.is_dynamic) return false;
        if (filter === "paused" && c.status !== "paused") return false;
        if (!q) return true;
        return [c.name, codeSummary(c), c.slug ?? ""].some((field) =>
          field.toLowerCase().includes(q),
        );
      })
      .sort((a, b) =>
        sort === "name"
          ? a.name.localeCompare(b.name)
          : sort === "scans"
            ? b.scan_count - a.scan_count
            : b.updated_at.localeCompare(a.updated_at),
      );
  }, [codes, query, filter, sort]);

  async function onDuplicate(code: QrCodeRow) {
    const result = await duplicateCode(code);
    if (!result.ok) return toast(result.error, "error");
    setCodes((current) => [result.value, ...current]);
    toast(`Duplicated as “${result.value.name}”`);
    router.refresh();
  }

  async function onToggleStatus(code: QrCodeRow) {
    const status = code.status === "paused" ? "active" : "paused";
    const result = await updateCode(code.id, { status });
    if (!result.ok) return toast(result.error, "error");
    setCodes((current) => current.map((c) => (c.id === code.id ? result.value : c)));
    toast(status === "paused" ? `Paused “${code.name}”` : `“${code.name}” is live again`);
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    const result = await deleteCode(toDelete.id);
    setDeleting(false);
    if (!result.ok) return toast(result.error, "error");
    setCodes((current) => current.filter((c) => c.id !== toDelete.id));
    toast(`Deleted “${toDelete.name}”`);
    setToDelete(null);
    router.refresh();
  }

  if (codes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-field-border px-6 py-14 text-center">
        <h2 className="font-display text-xl font-bold text-fg">No saved codes yet</h2>
        <p className="max-w-md text-fg-muted">
          Create a code, then press Save. Turn on “Dynamic link” for a Link code to change where it
          points later and see its scans here.
        </p>
        <Link href="/" className={buttonClasses("primary", "md")}>
          <Plus aria-hidden /> Create a code
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <label className="relative flex-1">
          <span className="sr-only">Search codes</span>
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-muted"
          />
          <TextInput
            type="search"
            placeholder="Search by name, link or content"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <SegmentedControl
          aria-label="Filter codes"
          value={filter}
          onChange={setFilter}
          options={FILTERS}
          className="md:w-80"
        />
        <label className="md:w-48">
          <span className="sr-only">Sort codes</span>
          <Select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="updated">Recently updated</option>
            <option value="scans">Most scanned</option>
            <option value="name">Name</option>
          </Select>
        </label>
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-fg-muted">
          No codes match. Try a different search or filter.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((code) => (
            <CodeCard
              key={code.id}
              code={code}
              onDuplicate={onDuplicate}
              onToggleStatus={onToggleStatus}
              onDelete={setToDelete}
            />
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        title={`Delete “${toDelete?.name ?? ""}”?`}
        description={
          toDelete?.is_dynamic
            ? "The short link stops working and its scan history is deleted. Printed copies of this code will show “not set up”."
            : "This removes the saved code from your account. Downloaded copies keep working."
        }
        confirmLabel="Delete"
        danger
        pending={deleting}
        onConfirm={confirmDelete}
        onClose={() => setToDelete(null)}
      />
    </div>
  );
}
