import type { NextRequest } from "next/server";

import { apiError, apiJson, authenticate, dbError, isUuid, preflight } from "@/lib/api/v1";
import { isTimeZone } from "@/lib/time/zone";

export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

/** GET /api/v1/codes/:id/analytics?from=…&to=…&tz=…: scans, visitors and breakdowns. */
export async function GET(
  request: NextRequest,
  { params }: RouteContext<"/api/v1/codes/[id]/analytics">,
) {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;
  const { id } = await params;
  if (!isUuid(id)) return apiError(404, "not_found", "No code with that id in your account.");
  const search = request.nextUrl.searchParams;
  const to = search.get("to") ? new Date(search.get("to")!) : new Date();
  const from = search.get("from")
    ? new Date(search.get("from")!)
    : new Date(to.getTime() - 30 * 86_400_000);
  const tz = search.get("tz") ?? "UTC";
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from >= to) {
    return apiError(
      400,
      "invalid_request",
      "from and to must be ISO 8601 dates, with from before to",
    );
  }
  if (!isTimeZone(tz))
    return apiError(400, "invalid_request", "tz must be an IANA time zone, like America/Chicago");
  const { data, error } = await auth.admin.rpc("api_code_analytics", {
    p_user: auth.userId,
    p_id: id,
    p_from: from.toISOString(),
    p_to: to.toISOString(),
    p_tz: tz,
  });
  if (error) return dbError(error);
  if (!data) return apiError(404, "not_found", "No code with that id in your account.");
  return apiJson({ data, from: from.toISOString(), to: to.toISOString(), tz });
}
