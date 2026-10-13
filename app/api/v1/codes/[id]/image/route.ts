import type { NextRequest } from "next/server";

import { sanitizeDesign } from "@/features/generator/state/sanitize";
import {
  apiError,
  authenticate,
  dbError,
  imageOptions,
  isUuid,
  preflight,
  qrImage,
  withLinks,
} from "@/lib/api/v1";

export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

/** GET /api/v1/codes/:id/image?format=svg|png&size=512: a plain image of a saved code in its colors. */
export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/api/v1/codes/[id]/image">,
) {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;
  const { id } = await params;
  if (!isUuid(id)) return apiError(404, "not_found", "No code with that id in your account.");
  const { data, error } = await auth.admin.rpc("api_code", { p_user: auth.userId, p_id: id });
  if (error) return dbError(error);
  if (!data) return apiError(404, "not_found", "No code with that id in your account.");
  const code = withLinks(data as Record<string, unknown>);
  if (!code.payload)
    return apiError(400, "invalid_request", "This code has nothing to encode yet.");
  const design = sanitizeDesign(code.design);
  const options = imageOptions(request.nextUrl.searchParams, {
    data: String(code.payload),
    fg: design.fgColor,
    bg: design.transparent ? "#FFFFFF" : design.bgColor,
    errorCorrection: design.errorCorrection,
  });
  if ("error" in options) return options.error;
  return qrImage(options);
}
