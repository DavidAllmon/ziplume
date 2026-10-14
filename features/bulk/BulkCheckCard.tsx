"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";

import { Card, CardHeader } from "@/components/ui/Card";
import { MAX_BULK_ROWS, type BulkResult, type BulkRow } from "@/lib/bulk/rows";

const PREVIEW_ROWS = 100;

/** Step 2: which rows are ready and which need fixing (with why). */
export function BulkCheckCard({ result, rows }: { result: BulkResult; rows: BulkRow[] }) {
  const ready = rows.filter((row) => !row.error).length;
  const invalid = rows.length - ready;
  return (
    <Card aria-labelledby="bulk-check">
      <CardHeader
        id="bulk-check"
        step={2}
        title="Check your codes"
        description={
          result.error ? undefined : `${ready} ready${invalid ? `, ${invalid} need fixing` : ""}.`
        }
      />
      <div className="flex flex-col gap-3 px-5 pt-4 pb-6 sm:px-6">
        {result.error ? (
          <p className="flex items-start gap-2 rounded-control bg-danger-soft px-3.5 py-2.5 text-sm text-danger">
            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
            {result.error}
          </p>
        ) : (
          <>
            {(result.ignored.length > 0 || result.skipped > 0) && (
              <p className="text-sm text-fg-muted">
                {result.ignored.length > 0 && `Ignored columns: ${result.ignored.join(", ")}. `}
                {result.skipped > 0 &&
                  `Only the first ${MAX_BULK_ROWS} rows are used; ${result.skipped} more were left out.`}
              </p>
            )}
            <div
              role="region"
              aria-label="Codes from your list"
              tabIndex={0}
              className="max-h-96 overflow-auto rounded-control border border-border focus-ring"
            >
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-surface-2 text-fg">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Row</th>
                    <th className="px-3 py-2 font-semibold">Name</th>
                    <th className="px-3 py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, PREVIEW_ROWS).map((row) => (
                    <tr key={row.line} className="border-t border-border align-top">
                      <td className="px-3 py-2 text-fg-muted tabular-nums">{row.line}</td>
                      <td className="max-w-56 truncate px-3 py-2 text-fg">{row.name}</td>
                      <td className="px-3 py-2">
                        {row.error ? (
                          <span className="flex items-start gap-1.5 text-danger">
                            <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0" />
                            {row.error}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-success">
                            <CheckCircle2 aria-hidden className="size-4 shrink-0" />
                            Ready
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > PREVIEW_ROWS && (
              <p className="text-sm text-fg-muted">
                Showing the first {PREVIEW_ROWS} of {rows.length} rows.
              </p>
            )}
            {invalid > 0 && (
              <p className="text-sm text-fg-muted">
                Rows that need fixing are left out. Fix them in your file and upload it again.
              </p>
            )}
          </>
        )}
      </div>
    </Card>
  );
}
