import { sanitizePage } from "@/lib/pages/sanitize";
import { mediaUrl, safeHref } from "@/lib/pages/urls";
import { isPageType } from "@/lib/qr/types";

export interface ScannedCode {
  destination: string | null;
  qr_type: string;
  content: unknown;
}

/**
 * Where a scan of a dynamic code goes: the destination for links, the hosted page for pages,
 * except that a "direct" PDF opens the file and an app code sends phones to their store.
 */
export function scanTarget(
  code: ScannedCode,
  slug: string,
  os: string | null,
  siteUrl: string,
): string | null {
  const pageUrl = new URL(`/p/${encodeURIComponent(slug)}`, siteUrl).toString();
  if (!isPageType(code.qr_type)) return code.destination;

  if (code.qr_type === "pdf") {
    const page = sanitizePage("pdf", code.content);
    // Straight to the file only when there's one to go to (spec item 39).
    const files = page.files.filter((f) => f.file);
    if (page.direct && files.length === 1) return mediaUrl(files[0]!.file!.path);
  }
  if (code.qr_type === "app") {
    const page = sanitizePage("app", code.content);
    // Only while the page's "Send phones straight to their store" is on (spec item 51).
    if (page.storeRedirect) {
      const ios = safeHref(page.iosUrl);
      const android = safeHref(page.androidUrl);
      if (ios && (os === "iOS" || os === "iPadOS")) return ios;
      if (android && os === "Android") return android;
    }
  }
  return pageUrl;
}
