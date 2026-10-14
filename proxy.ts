import { NextResponse, type NextRequest } from "next/server";

import { accountsEnabled } from "@/lib/env";
import { editRedirect } from "@/lib/redirects";
import { refreshSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

  if (!accountsEnabled) return NextResponse.next();
  return refreshSession(request);
}

export const config = {
  matcher: [
    "/",
    "/R/:path*",
    "/codes/:path*",
    "/team/:path*",
    "/settings/:path*",
    "/account/:path*",
  ],
};
