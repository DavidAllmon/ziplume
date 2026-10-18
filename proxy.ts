import { NextResponse, type NextRequest } from "next/server";

import { accountsEnabled, SITE_URL } from "@/lib/env";
import { legacyHostAction, legacyHosts } from "@/lib/hosts";
import { editRedirect } from "@/lib/redirects";
import { refreshSession } from "@/lib/supabase/proxy";

/** The pages that read the signed-in session; only these refresh it. */
const SESSION_PATHS = /^\/(?:$|(?:codes|templates|team|settings|account)(?:\/|$))/;

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // An old address (LEGACY_HOSTS) keeps answering printed codes and forwards everything else.
  const forward = legacyHostAction(request.headers.get("host"), pathname, search, {
    siteUrl: SITE_URL,
    legacyHosts: legacyHosts(),
  });
  if (forward) return NextResponse.redirect(forward, 308);

  // Dynamic codes are encoded in uppercase (HTTPS://QR.EXAMPLE/R/AB3X9Q) so the QR can use its
  // compact alphanumeric mode; route those to the lowercase /r/ handler.
  if (pathname.startsWith("/R/")) {
    const url = request.nextUrl.clone();
    url.pathname = `/r/${pathname.slice(3)}`;
    return NextResponse.rewrite(url);
  }

  // Old bookmarks and links to the home page's edit mode open the code in the editor.
  const edit = editRedirect(request.nextUrl);
  if (edit) return NextResponse.redirect(edit, 308);

  if (!accountsEnabled || !SESSION_PATHS.test(pathname)) return NextResponse.next();
  return refreshSession(request);
}

export const config = {
  // Every request, so the old-address rule sees them all; Next's own build files skip it.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
