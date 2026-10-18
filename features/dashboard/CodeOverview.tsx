"use client";

import {
  ArrowLeft,
  BarChart3,
  Copy,
  ExternalLink,
  FolderInput,
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button, buttonClasses } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Toggle } from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/Toast";
import { deleteCode, updateCode } from "@/features/codes/api";
import { copyToMyCodes } from "@/features/codes/duplicate";
import { moveCodes } from "@/features/folders/api";
import { MoveDialog } from "@/features/folders/MoveDialog";
import { ExportPanel } from "@/features/generator/export/ExportPanel";
import { PagePreview } from "@/features/generator/preview/PagePreview";
import { QrTile } from "@/features/generator/preview/QrTile";
import { DEFAULT_EXPORT } from "@/features/generator/state/defaults";
import { shortLink, shortLinkLabel } from "@/lib/env";
import { sanitizePage } from "@/lib/pages/sanitize";
import { buildFilename, slugify } from "@/lib/qr/filename";
import { isPageType, type PageTypeId } from "@/lib/qr/types";
import { useInBrowser } from "@/lib/useInBrowser";
import type { FolderRow, QrCodeRow } from "@/types/supabase";

import { codeRenderOptions, codeSummary, codeType, codeTypeLabel } from "./codeRender";
import { ContactShares } from "./ContactShares";
import { CopyButton } from "./CopyButton";
import { CouponUses } from "./CouponUses";
import { EventRsvps } from "./EventRsvps";
import { FeedbackResponses } from "./FeedbackResponses";
import { formatCount, relativeTime } from "./format";
import { ResponseEmails, takesResponses } from "./ResponseEmails";

/** When a trackable code works, in words: "Always", "From …", "Until …" or "… to …". */
export function activeWindow(
  from: string | null,
  until: string | null,
  format: (iso: string) => string,
): string {
  if (from && until) return `${format(from)} to ${format(until)}`;
  if (from) return `From ${format(from)}`;
  if (until) return `Until ${format(until)}`;
  return "Always";
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

/** A saved code at a glance: its link, scans, access and download. Changes happen in the editor. */
export function CodeOverview({
  code: initial,
  canEdit,
  folders,
  back,
  editHref,
  fromTeammate,
  emailReady = false,
}: {
  code: QrCodeRow;
  canEdit: boolean;
  /** The code owner's folders. */
  folders: FolderRow[];
  /** The codes list this code lives in (yours, or a teammate's). */
  back: { href: string; label: string };
  /** The editor for this code. */
  editHref: string;
  /** A teammate's code: Duplicate copies it into your own codes. */
  fromTeammate: boolean;
  /** This server can send email (BREVO_API_KEY is set). */
  emailReady?: boolean;
}) {
  const isPage = isPageType(initial.qr_type);
  // What the page shows today, for the small preview (checked the same way /p checks it).
  const page = isPage ? sanitizePage(initial.qr_type as PageTypeId, initial.content) : null;
  const router = useRouter();
  const toast = useToast();
  const inBrowser = useInBrowser();
  const [code, setCode] = useState(initial);
  const [exportSettings, setExportSettings] = useState(DEFAULT_EXPORT);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moving, setMoving] = useState(false);

  const options = useMemo(
    () => codeRenderOptions(code, exportSettings.size),
    [code, exportSettings.size],
  );
  const extension = exportSettings.format === "jpeg" ? "jpg" : exportSettings.format;
  const filename = buildFilename(codeType(code), slugify(code.name), extension);
  const folderName = folders.find((folder) => folder.id === code.folder_id)?.name ?? "No folder";

  async function setActive(active: boolean) {
    setBusy("status");
    const result = await updateCode(code.id, { status: active ? "active" : "paused" });
    setBusy(null);
    if (!result.ok) return toast(result.error, "error");
    setCode(result.value);
    toast(active ? (isPage ? "The page is live again" : "The code is live again") : "Paused");
    router.refresh();
  }

  async function duplicate() {
    setBusy("duplicate");
    const result = await copyToMyCodes(code, { fromTeammate });
    setBusy(null);
    if (!result.ok) return toast(result.error, "error");
    toast(
      fromTeammate ? `Copied “${code.name}” to your codes` : `Duplicated as “${result.value.name}”`,
    );
    router.push(`/codes/${result.value.id}`);
  }

  async function move(folderId: string | null) {
    setBusy("move");
    const result = await moveCodes([code.id], folderId);
    setBusy(null);
    if (!result.ok) return toast(result.error, "error");
    setCode({ ...code, folder_id: folderId });
    setMoving(false);
    toast(
      folderId
        ? `Moved to “${folders.find((folder) => folder.id === folderId)?.name}”`
        : "Removed from its folder",
    );
    router.refresh();
  }

  async function onDelete() {
    setBusy("delete");
    const result = await deleteCode(code.id);
    setBusy(null);
    if (!result.ok) return toast(result.error, "error");
    toast(`Deleted “${code.name}”`);
    router.replace(back.href);
    router.refresh();
  }

  const shortLinkRow = code.slug ? (
    <div className="flex flex-wrap items-center gap-2 rounded-control bg-surface-2 px-3.5 py-2.5 text-sm">
      <span className="eyebrow text-fg-muted">Short link</span>
      <span className="font-mono text-fg">{shortLinkLabel(code.slug)}</span>
      <CopyButton text={shortLink(code.slug)} />
      <a
        href={isPage ? `/p/${code.slug}` : shortLink(code.slug)}
        target="_blank"
        rel="noopener"
        className="ml-auto inline-flex items-center gap-1 font-medium text-link"
      >
        {isPage ? "View page" : "Test"} <ExternalLink aria-hidden className="size-3.5" />
      </a>
    </div>
  ) : null;

  const activeToggle = (
    <Toggle
      label="Active"
      description={
        code.status === "active"
          ? isPage
            ? "Scans open the page."
            : "Scans redirect to the destination."
          : "Paused: scanners see a “paused” notice and scans aren't counted."
      }
      checked={code.status === "active"}
      disabled={!canEdit || busy !== null}
      onChange={(active) => void setActive(active)}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Link
          href={back.href}
          className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-link underline-offset-4 hover:underline"
        >
          <ArrowLeft aria-hidden className="size-4" /> {back.label}
        </Link>
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="truncate font-display text-3xl font-bold tracking-tight text-fg">
              {code.name}
            </h1>
            <p className="mt-1 text-sm text-fg-muted">
              {codeTypeLabel(code)} ·{" "}
              {isPage ? "Hosted page" : code.is_dynamic ? "Trackable" : "Static"} · Updated{" "}
              {relativeTime(code.updated_at)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Link href={editHref} className={buttonClasses("primary", "md")}>
                <Pencil aria-hidden /> Edit code
              </Link>
            )}
            {code.is_dynamic && (
              <Link href={`/codes/${code.id}/analytics`} className={buttonClasses("outline", "md")}>
                <BarChart3 aria-hidden /> Analytics
              </Link>
            )}
          </div>
        </div>
      </div>

      {!canEdit && (
        <p className="rounded-control bg-surface-2 px-4 py-3 text-sm text-fg-muted">
          You can view this code but not change it. Ask the code’s owner to make you an editor.
        </p>
      )}

      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_20rem] lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="flex min-w-0 flex-col gap-6">
          {isPage && (
            <Card>
              <CardHeader
                title="Hosted page"
                description="Edit the code to change the page. Printed codes always open the latest version."
              />
              {/* Side by side only when the card itself is wide enough: its column narrows
                  between the app's sidebar and the Download panel. */}
              <div className="@container px-5 pt-4 pb-6 sm:px-6">
                <div className="grid gap-6 @min-[29rem]:grid-cols-[minmax(0,1fr)_12rem]">
                  <div className="flex min-w-0 flex-col gap-5">
                    {shortLinkRow}
                    {activeToggle}
                  </div>
                  {page && code.slug && (
                    <div className="flex flex-col items-center gap-3">
                      {/* A glimpse only (View page and Edit page are beside it): it doesn't take
                          the wheel, focus or a screen reader's attention from the code page. */}
                      <div inert className="w-full max-w-48">
                        <PagePreview
                          type={initial.qr_type as PageTypeId}
                          page={page}
                          slug={code.slug}
                          maxHeight={360}
                        />
                      </div>
                      {canEdit && (
                        <Link
                          href={`${editHref}#content`}
                          className={buttonClasses("outline", "sm")}
                        >
                          Edit page
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {code.is_dynamic && !isPage && (
            <Card>
              <CardHeader
                title="Where it points"
                description="Edit the code to change where it goes. Printed codes update instantly."
              />
              <div className="flex flex-col gap-5 px-5 pt-4 pb-6 sm:px-6">
                {shortLinkRow}
                {code.destination && (
                  <p className="text-sm">
                    <span className="text-fg-muted">Goes to </span>
                    <a
                      href={code.destination}
                      target="_blank"
                      rel="noopener"
                      className="font-medium break-all text-link"
                    >
                      {code.destination}
                    </a>
                  </p>
                )}
                {activeToggle}
              </div>
            </Card>
          )}

          {!code.is_dynamic && (
            <Card>
              <CardHeader
                title="Content"
                description="Static codes contain their content directly, so printed copies can't change."
              />
              <div className="px-5 pt-4 pb-6 sm:px-6">
                <p className="rounded-control bg-surface-2 px-3.5 py-2.5 text-sm break-words text-fg">
                  {codeSummary(code)}
                </p>
              </div>
            </Card>
          )}

          {code.is_dynamic && (
            <Card>
              <CardHeader title="Access" />
              <dl className="grid gap-4 px-5 pt-4 pb-6 text-sm sm:grid-cols-2 sm:px-6">
                <div className="flex flex-col gap-1">
                  <dt className="text-fg-muted">Password</dt>
                  <dd className="font-medium text-fg">
                    {code.has_password ? "Password protected" : "No password"}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-fg-muted">Active dates</dt>
                  <dd className="font-medium text-fg">
                    {inBrowser
                      ? activeWindow(code.active_from, code.active_until, formatDate)
                      : "…"}
                  </dd>
                </div>
              </dl>
            </Card>
          )}

          {!fromTeammate && takesResponses(code.qr_type, code.content, code.notify_responses) && (
            <ResponseEmails
              codeId={code.id}
              initial={code.notify_responses}
              emailReady={emailReady}
            />
          )}
          {code.qr_type === "feedback" && (
            <FeedbackResponses codeId={code.id} content={code.content} />
          )}
          {code.qr_type === "vcard" && (
            <ContactShares codeId={code.id} content={code.content} canEdit={canEdit} />
          )}
          {code.qr_type === "coupon" && <CouponUses codeId={code.id} content={code.content} />}
          {code.qr_type === "event" && (
            <EventRsvps codeId={code.id} content={code.content} canEdit={canEdit} />
          )}

          <Card>
            <CardHeader title="Details" />
            <div className="flex flex-col gap-5 px-5 pt-4 pb-6 sm:px-6">
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <dt className="text-fg-muted">Folder</dt>
                  <dd className="font-medium text-fg">{folderName}</dd>
                </div>
                {code.is_dynamic && (
                  <div className="flex flex-col gap-1">
                    <dt className="text-fg-muted">Scans</dt>
                    <dd className="font-medium text-fg">
                      {formatCount(code.scan_count)} {code.scan_count === 1 ? "scan" : "scans"} ·
                      last scanned {relativeTime(code.last_scanned_at).toLowerCase()}
                    </dd>
                  </div>
                )}
              </dl>
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => void duplicate()}
                    disabled={busy !== null}
                  >
                    <Copy aria-hidden /> Duplicate
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setMoving(true)}
                    disabled={busy !== null || (folders.length === 0 && !code.folder_id)}
                  >
                    <FolderInput aria-hidden /> Move to folder
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-danger"
                    onClick={() => setConfirmDelete(true)}
                    disabled={busy !== null}
                  >
                    <Trash2 aria-hidden /> Delete code
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>

        <aside className="md:sticky md:top-20 lg:top-24">
          <Card id="download" className="scroll-mt-20 sm:scroll-mt-6">
            <CardHeader title="Download" />
            <div className="flex flex-col gap-5 px-5 pt-4 pb-6 sm:px-6">
              <QrTile
                options={options}
                summary={code.name}
                emptyHint=""
                className="mx-auto w-full max-w-[18rem]"
              />
              <ExportPanel
                options={options}
                settings={exportSettings}
                filename={filename}
                blocker={null}
                dispatch={(action) => {
                  if (action.type === "setExport")
                    setExportSettings((settings) => ({ ...settings, ...action.patch }));
                }}
              />
            </div>
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete “${code.name}”?`}
        description={
          code.is_dynamic
            ? "The short link stops working and its scan history is deleted. Printed copies of this code will show “not set up”."
            : "This removes the saved code from your account. Downloaded copies keep working."
        }
        confirmLabel="Delete"
        danger
        pending={busy === "delete"}
        onConfirm={onDelete}
        onClose={() => setConfirmDelete(false)}
      />
      <MoveDialog
        open={moving}
        count={1}
        folders={folders}
        current={code.folder_id}
        pending={busy === "move"}
        onMove={(folderId) => void move(folderId)}
        onClose={() => setMoving(false)}
      />
    </div>
  );
}
