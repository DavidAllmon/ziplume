"use client";

import { Download, FileUp } from "lucide-react";
import { useId, useState } from "react";

import { Button, buttonClasses } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select, Textarea } from "@/components/ui/inputs";
import { bulkColumns, MAX_BULK_ROWS, templateCsv } from "@/lib/bulk/rows";
import { saveBlob } from "@/lib/download";
import { codeTypeInfo } from "@/lib/qr/code-types";
import { QR_TYPE_IDS, type QrTypeId } from "@/lib/qr/types";

const MAX_FILE_BYTES = 2 * 1024 * 1024;

/** Step 1 of bulk creation: pick a type, then upload or paste a spreadsheet. */
export function BulkListCard({
  type,
  onTypeChange,
  text,
  onTextChange,
  disabled = false,
}: {
  type: QrTypeId;
  onTypeChange: (type: QrTypeId) => void;
  text: string;
  onTextChange: (text: string) => void;
  /** Locks the list while it is being saved. */
  disabled?: boolean;
}) {
  const fileId = useId();
  const [fileError, setFileError] = useState("");

  function downloadTemplate() {
    saveBlob(
      new Blob([templateCsv(type)], { type: "text/csv;charset=utf-8" }),
      `ziplume-${type}-template.csv`,
    );
  }

  async function readFile(file: File | undefined) {
    if (!file) return;
    setFileError("");
    if (file.size > MAX_FILE_BYTES) return setFileError("That file is over 2 MB.");
    try {
      onTextChange(await file.text());
    } catch {
      setFileError("That file couldn’t be read.");
    }
  }

  return (
    <Card aria-labelledby="bulk-list">
      <CardHeader
        id="bulk-list"
        step={1}
        title="Your list"
        description={`One code per row, up to ${MAX_BULK_ROWS}. Export from Excel, Google Sheets or Numbers as CSV, or paste the cells.`}
      />
      <div className="flex flex-col gap-4 px-5 pt-4 pb-6 sm:px-6">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Field label="Type of code">
            {(control) => (
              <Select
                {...control}
                value={type}
                disabled={disabled}
                onChange={(event) => onTypeChange(event.target.value as QrTypeId)}
              >
                {QR_TYPE_IDS.map((id) => (
                  <option key={id} value={id}>
                    {codeTypeInfo(id).label}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Button variant="outline" onClick={downloadTemplate}>
            <Download aria-hidden /> CSV template
          </Button>
        </div>
        <p className="text-sm text-fg-muted">
          Columns:{" "}
          {bulkColumns(type).map((column, i) => (
            <span key={column}>
              {i > 0 && ", "}
              <code className="rounded bg-surface-2 px-1 py-0.5 font-mono text-xs text-fg">
                {column}
              </code>
            </span>
          ))}
          . Only the ones you need; extra columns are ignored.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor={fileId}
            aria-disabled={disabled || undefined}
            className={`${buttonClasses("secondary", "md")} cursor-pointer aria-disabled:pointer-events-none aria-disabled:opacity-50`}
          >
            <FileUp aria-hidden /> Upload CSV
          </label>
          <input
            id={fileId}
            type="file"
            accept=".csv,.tsv,.txt,text/csv,text/plain"
            className="sr-only"
            disabled={disabled}
            onChange={(event) => {
              void readFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <span className="text-sm text-fg-muted">or paste below</span>
        </div>
        {fileError && <p className="text-sm text-danger">{fileError}</p>}
        <Field label="CSV">
          {(control) => (
            <Textarea
              {...control}
              rows={8}
              spellCheck={false}
              className="font-mono text-sm"
              placeholder={templateCsv(type)}
              value={text}
              disabled={disabled}
              onChange={(event) => onTextChange(event.target.value)}
            />
          )}
        </Field>
      </div>
    </Card>
  );
}
