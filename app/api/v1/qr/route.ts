import type { NextRequest } from "next/server";

import { apiError, authenticate, imageOptions, preflight, qrImage } from "@/lib/api/v1";

export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

/** GET /api/v1/qr?data=…&format=svg|png&size=512&fg=0F172A&bg=FFFFFF&ec=M: any text as a QR image. */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;
  const data = request.nextUrl.searchParams.get("data") ?? "";
  if (!data) return apiError(400, "invalid_request", "data is required");
  if (data.length > 2953) return apiError(400, "invalid_request", "data is too long for a QR code");
  const options = imageOptions(request.nextUrl.searchParams, { data });
  if ("error" in options) return options.error;
  return qrImage(options);
}
