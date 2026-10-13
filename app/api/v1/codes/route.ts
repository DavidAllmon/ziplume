import type { NextRequest } from "next/server";

import {
  apiError,
  apiJson,
  authenticate,
  dbError,
  parseCreate,
  preflight,
  withLinks,
} from "@/lib/api/v1";
import type { Json } from "@/types/supabase";

export const dynamic = "force-dynamic";

export const OPTIONS = preflight;

/** GET /api/v1/codes?limit=50&offset=0: your codes, newest first. */
export async function GET(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? 50);
  const offset = Number(request.nextUrl.searchParams.get("offset") ?? 0);
  if (!Number.isInteger(limit) || limit < 1 || limit > 200)
    return apiError(400, "invalid_request", "limit must be 1–200");
  if (!Number.isInteger(offset) || offset < 0)
    return apiError(400, "invalid_request", "offset must be 0 or more");
  const { data, error } = await auth.admin.rpc("api_codes", {
    p_user: auth.userId,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) return dbError(error);
  const codes = (Array.isArray(data) ? data : []) as Record<string, unknown>[];
  return apiJson({ data: codes.map(withLinks), limit, offset });
}

/** POST /api/v1/codes: create a code. */
export async function POST(request: NextRequest) {
  const auth = await authenticate(request);
  if (auth instanceof Response) return auth;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "invalid_request", "The body must be JSON.");
  }
  const parsed = parseCreate(body, auth.userId);
  if ("error" in parsed) return parsed.error;
  const { data, error } = await auth.admin.rpc("api_create_code", {
    p_user: auth.userId,
    p_code: parsed.value as Json,
  });
  if (error) return dbError(error);
  return apiJson({ data: withLinks(data as Record<string, unknown>) }, 201);
}
