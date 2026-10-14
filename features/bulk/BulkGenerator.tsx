"use client";

import { Download } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/inputs";
import { useToast } from "@/components/ui/Toast";
import { useSession } from "@/features/auth/useSession";
import { QrTile } from "@/features/generator/preview/QrTile";
import { DEFAULT_DESIGN } from "@/features/generator/state/defaults";
import { parseBulk } from "@/lib/bulk/rows";
import { accountsEnabled } from "@/lib/env";
import type { ExportFormat, QrTypeId } from "@/lib/qr/types";

import { BulkCheckCard } from "./BulkCheckCard";
import { BulkListCard } from "./BulkListCard";
import { downloadZip, itemsFromRows, ZIP_FORMATS } from "./zip";

const linkClass = "font-medium text-link underline-offset-4 hover:underline";

/** The public bulk tool: one QR code per spreadsheet row, downloaded together as a ZIP. */
export function BulkGenerator() {
  const toast = useToast();
  const { user } = useSession();
  const [type, setType] = useState<QrTypeId>("url");
  const [text, setText] = useState("");
  const [format, setFormat] = useState<ExportFormat>("png");
  const [progress, setProgress] = useState<string | null>(null);

  const result = useMemo(
    () => (text.trim() ? parseBulk(type, text, DEFAULT_DESIGN.errorCorrection) : null),
    [type, text],
  );
  const valid = result?.rows.filter((row) => !row.error) ?? [];
  const preview = valid[0];

  async function run() {
    if (!valid.length || progress) return;
    setProgress(`Preparing 0 of ${valid.length}…`);
    try {
      await downloadZip(itemsFromRows(valid), format, `quickqreate-${type}-codes.zip`, (done) =>
        setProgress(`Preparing ${done} of ${valid.length}…`),
      );
      toast(`Downloaded ${valid.length} ${valid.length === 1 ? "code" : "codes"}`);
    } catch {
      toast("The ZIP file couldn’t be made. Please try again.", "error");
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
      <div className="flex min-w-0 flex-col gap-6">
        <BulkListCard type={type} onTypeChange={setType} text={text} onTextChange={setText} />
        {result && <BulkCheckCard result={result} rows={result.rows} />}
      </div>

      <aside className="lg:sticky lg:top-24">
        <Card aria-labelledby="bulk-download">
          <CardHeader id="bulk-download" step={result ? 3 : 2} title="Download" />
          <div className="flex flex-col gap-4 px-5 pt-4 pb-6 sm:px-6">
            <div className="flex items-center gap-4">
              <QrTile
                compact
                options={{ ...DEFAULT_DESIGN, data: preview?.payload ?? "", size: 256 }}
                summary={preview?.name ?? ""}
                emptyHint=""
                resolution={192}
                className="size-24 shrink-0"
              />
              <p className="text-sm text-fg-muted">
                Every code uses the classic black-and-white design, which scans most reliably.
              </p>
            </div>
            <Field label="File format">
              {(control) => (
                <Select
                  {...control}
                  value={format}
                  onChange={(event) => setFormat(event.target.value as ExportFormat)}
                >
                  {ZIP_FORMATS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Button
              size="lg"
              disabled={!valid.length || progress !== null}
              onClick={() => void run()}
            >
              <Download aria-hidden />
              {progress ??
                (valid.length
                  ? `Download ${valid.length} ${valid.length === 1 ? "code" : "codes"}`
                  : "Download ZIP")}
            </Button>
            {accountsEnabled && (
              <p className="text-sm text-fg-muted">
                {user ? (
                  <>
                    Want them in your account, with folders and tracking?{" "}
                    <Link href="/codes/bulk" className={linkClass}>
                      Create them in your codes
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    <Link href="/login?next=/codes/bulk" className={linkClass}>
                      Sign in
                    </Link>{" "}
                    to save them to your account, with folders and tracking.
                  </>
                )}
              </p>
            )}
          </div>
        </Card>
      </aside>
    </div>
  );
}
