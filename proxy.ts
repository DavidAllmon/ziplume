import { NextResponse, type NextRequest } from "next/server";

import { accountsEnabled } from "@/lib/env";
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

  if (!accountsEnabled) return NextResponse.next();
  return refreshSession(request);
}

export const config = {
  matcher: ["/R/:path*", "/dashboard/:path*", "/account/:path*"],
};
