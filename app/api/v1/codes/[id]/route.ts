import type { NextRequest } from "next/server";

import {
  apiError,
  apiJson,
  authenticate,
  dbError,
  isUuid,
  parseUpdate,
  preflight,
  withLinks,
} from "@/lib/api/v1";
import type { Json } from "@/types/supabase";

export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

const NOT_FOUND = () => apiError(404, "not_found", "No code with that id in your account.");

export async function GET(request: NextRequest, { params }: RouteContext<"/api/v1/codes/[id]">) {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;
  const { id } = await params;
  if (!isUuid(id)) return NOT_FOUND();
  const { data, error } = await auth.admin.rpc("api_code", { p_user: auth.userId, p_id: id });
  if (error) return dbError(error);
  return data ? apiJson({ data: withLinks(data as Record<string, unknown>) }) : NOT_FOUND();
}

export async function PATCH(request: NextRequest, { params }: RouteContext<"/api/v1/codes/[id]">) {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;
  const { id } = await params;
  if (!isUuid(id)) return NOT_FOUND();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "invalid_request", "The body must be JSON.");
  }
  const current = await auth.admin.rpc("api_code", { p_user: auth.userId, p_id: id });
  if (current.error) return dbError(current.error);
  if (!current.data) return NOT_FOUND();
  const code = current.data as { type: string; dynamic: boolean };
  const parsed = parseUpdate(body, code, auth.userId);
  if ("error" in parsed) return parsed.error;
  const { data, error } = await auth.admin.rpc("api_update_code", {
    p_user: auth.userId,
    p_id: id,
    p_patch: parsed.value as Json,
  });
  if (error) return dbError(error);
  return data ? apiJson({ data: withLinks(data as Record<string, unknown>) }) : NOT_FOUND();
}

export async function DELETE(request: NextRequest, { params }: RouteContext<"/api/v1/codes/[id]">) {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;
  const { id } = await params;
  if (!isUuid(id)) return NOT_FOUND();
  const { data, error } = await auth.admin.rpc("api_delete_code", {
    p_user: auth.userId,
    p_id: id,
  });
  if (error) return dbError(error);
  return data
    ? new Response(null, { status: 204, headers: { "access-control-allow-origin": "*" } })
    : NOT_FOUND();
}
