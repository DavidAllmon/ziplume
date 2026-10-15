import "server-only";

import QRCode from "qrcode";

import { sanitizeContent, sanitizeDesign } from "@/features/generator/state/sanitize";
import { dynamicPayload, isValidSlug } from "@/lib/dynamic/slug";
import { shortLink } from "@/lib/env";
import { mediaPaths, sanitizePage } from "@/lib/pages/sanitize";
import { validatePage } from "@/lib/pages/validate";
import { normalizeHex } from "@/lib/color/contrast";
import { codeTypeInfo } from "@/lib/qr/code-types";
import { normalizeUrl } from "@/lib/qr/normalize";
import { encodeContent, validateContent } from "@/lib/qr/qr-types";
import { toUtf8BinaryString } from "@/lib/qr/utf8";
import { isPageType, isStaticType, type CodeTypeId, type ErrorCorrection } from "@/lib/qr/types";
import { isValidUrl } from "@/lib/qr/validators";
import { getAdminSupabase } from "@/lib/supabase/admin";
import type { Json } from "@/types/supabase";

// Shared plumbing for the public REST API (/api/v1): key authentication, rate limiting,
// JSON errors and input validation that reuses the same rules as the app.

export const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-max-age": "86400",
};

export function apiError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): Response {
  return Response.json(
    { error: { code, message, ...(details ? { details } : {}) } },
    { status, headers: { ...CORS_HEADERS, "cache-control": "no-store" } },
  );
}

export const apiJson = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { ...CORS_HEADERS, "cache-control": "no-store" } });

export const preflight = () => new Response(null, { status: 204, headers: CORS_HEADERS });

const RATE = { limit: 120, windowMs: 60_000 };
const buckets = new Map<string, { count: number; resetAt: number }>();

function rateLimited(key: string, now = Date.now()): boolean {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + RATE.windowMs });
    if (buckets.size > 10_000) for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE.limit;
}

export type Admin = NonNullable<ReturnType<typeof getAdminSupabase>>;

/** The API key in an Authorization header: zl_ keys, or qq_ keys issued before Ziplume. */
export function apiKeyFrom(header: string | null): string | null {
  return /^Bearer\s+((?:qq|zl)_[0-9a-f]{48})$/i.exec(header ?? "")?.[1] ?? null;
}

/** The key owner's id and an admin client, or an error response. */
export async function authenticate(
  request: Request,
): Promise<{ userId: string; admin: Admin } | Response> {
  const admin = getAdminSupabase();
  if (!admin) return apiError(503, "unavailable", "The API isn't available on this server.");
  const key = apiKeyFrom(request.headers.get("authorization"));
  if (!key)
    return apiError(401, "unauthorized", "Send your API key as: Authorization: Bearer zl_…");
  if (rateLimited(key))
    return apiError(429, "rate_limited", "Too many requests. The limit is 120 per minute.");
  const { data, error } = await admin.rpc("api_key_user", { p_key: key });
  if (error) return apiError(503, "unavailable", "The API is temporarily unavailable.");
  if (!data)
    return apiError(401, "unauthorized", "That API key isn't valid. It may have been revoked.");
  return { userId: data, admin };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string) => UUID.test(value);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function isoDate(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) return undefined;
  return new Date(value).toISOString();
}

type Invalid = { error: Response };
const invalid = (message: string, details?: unknown): Invalid => ({
  error: apiError(400, "invalid_request", message, details),
});

/** Validates the fields both create and update accept; returns the database patch. */
function commonFields(
  input: Record<string, unknown>,
  patch: Record<string, unknown>,
): Invalid | null {
  if ("name" in input) {
    if (typeof input.name !== "string" || !input.name.trim())
      return invalid("name must be a non-empty string");
    patch.name = input.name.trim().slice(0, 120);
  }
  if ("status" in input) {
    if (input.status !== "active" && input.status !== "paused")
      return invalid('status must be "active" or "paused"');
    patch.status = input.status;
  }
  if ("folder_id" in input) {
    if (
      input.folder_id !== null &&
      (typeof input.folder_id !== "string" || !isUuid(input.folder_id))
    ) {
      return invalid("folder_id must be a folder id or null");
    }
    patch.folder_id = input.folder_id;
  }
  for (const key of ["active_from", "active_until"] as const) {
    if (key in input) {
      const value = isoDate(input[key]);
      if (value === undefined) return invalid(`${key} must be an ISO 8601 date-time or null`);
      patch[key] = value;
    }
  }
  if ("design" in input) {
    if (!isObject(input.design)) return invalid("design must be an object");
    // Uploaded logos aren't accepted through the API (preset icons are).
    patch.design = { ...sanitizeDesign(input.design), logo: null } as unknown as Json;
  }
  if ("slug" in input) {
    if (typeof input.slug !== "string" || !isValidSlug(input.slug)) {
      return invalid("slug must be 3–40 letters, numbers or dashes");
    }
    patch.slug = input.slug;
  }
  return null;
}

const httpUrl = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const url = normalizeUrl(value);
  return /^https?:\/\//i.test(url) && isValidUrl(url) ? url : null;
};

/** Checks and normalizes content for a type; pages may only use files from the owner's folder. */
function content(type: CodeTypeId, raw: unknown, userId: string): Invalid | { value: Json } {
  if (isPageType(type)) {
    const page = sanitizePage(type, raw);
    const errors = validatePage(type, page);
    if (Object.keys(errors).length) return invalid("content isn't valid for this type", errors);
    if (mediaPaths(page).some((path) => !path.startsWith(`${userId}/`))) {
      return invalid("content refers to files you don't own");
    }
    return { value: page as unknown as Json };
  }
  const values = sanitizeContent(type, raw);
  const errors = validateContent(type, values) as Record<string, string>;
  if (Object.keys(errors).length) return invalid("content isn't valid for this type", errors);
  return { value: values as unknown as Json };
}

export function parseCreate(
  body: unknown,
  userId: string,
): Invalid | { value: Record<string, unknown> } {
  if (!isObject(body)) return invalid("Send a JSON object");
  const type = body.type;
  if (typeof type !== "string" || !(isStaticType(type) || isPageType(type))) {
    return invalid("type must be one of the documented code types");
  }
  const dynamic = isPageType(type) || body.dynamic === true;
  if (dynamic && type !== "url" && !isPageType(type))
    return invalid("Only url codes and hosted pages can be dynamic");
  const patch: Record<string, unknown> = { type, dynamic, name: codeTypeInfo(type).label };
  const common = commonFields(body, patch);
  if (common) return common;

  if (type === "url" && dynamic) {
    const destination = httpUrl(body.destination);
    if (!destination) return invalid("destination must be an http(s) URL for dynamic url codes");
    patch.destination = destination;
    patch.content = { url: destination };
  } else {
    const result = content(type, body.content ?? {}, userId);
    if ("error" in result) return result;
    patch.content = result.value;
  }
  return { value: patch };
}

export function parseUpdate(
  body: unknown,
  current: { type: string; dynamic: boolean },
  userId: string,
): Invalid | { value: Record<string, unknown> } {
  if (!isObject(body)) return invalid("Send a JSON object");
  const patch: Record<string, unknown> = {};
  const common = commonFields(body, patch);
  if (common) return common;
  if ("slug" in patch && !current.dynamic) return invalid("Only dynamic codes have a slug");
  const type = current.type as CodeTypeId;

  if ("destination" in body) {
    if (!(current.dynamic && type === "url"))
      return invalid("Only dynamic url codes have a destination");
    const destination = httpUrl(body.destination);
    if (!destination) return invalid("destination must be an http(s) URL");
    patch.destination = destination;
    patch.content = { url: destination };
  } else if ("content" in body) {
    if (current.dynamic && type === "url")
      return invalid("Change a dynamic url code with destination");
    const result = content(type, body.content, userId);
    if ("error" in result) return result;
    patch.content = result.value;
  }
  return { value: patch };
}

/** Adds what clients need to render the code themselves. */
export function withLinks(code: Record<string, unknown>): Record<string, unknown> {
  const slug = typeof code.slug === "string" ? code.slug : null;
  const type = String(code.type) as CodeTypeId;
  let payload: string | null = null;
  if (code.dynamic && slug) payload = dynamicPayload(slug);
  else if (isStaticType(type)) payload = encodeContent(type, sanitizeContent(type, code.content));
  return { ...code, short_link: slug && code.dynamic ? shortLink(slug) : null, payload };
}

/** Maps database errors to API errors. */
export function dbError(error: { code?: string; message: string }): Response {
  if (error.code === "23505") return apiError(409, "slug_taken", "That slug is already taken.");
  if (error.code === "23503")
    return apiError(400, "invalid_request", "folder_id doesn't match one of your folders.");
  if (error.code === "23514" || error.code === "22P02" || error.code === "22007") {
    return apiError(400, "invalid_request", "Some fields aren't valid.", { reason: error.message });
  }
  return apiError(503, "unavailable", "The API is temporarily unavailable.");
}

export interface QrImageOptions {
  data: string;
  format: "svg" | "png";
  size: number;
  fg: string;
  bg: string;
  errorCorrection: ErrorCorrection;
}

/** Reads image options from query parameters, with safe defaults. */
export function imageOptions(
  params: URLSearchParams,
  defaults: Partial<QrImageOptions> = {},
): QrImageOptions | Invalid {
  const format = (params.get("format") ?? defaults.format ?? "svg").toLowerCase();
  if (format !== "svg" && format !== "png") return invalid("format must be svg or png");
  const size = Number(params.get("size") ?? defaults.size ?? 512);
  if (!Number.isInteger(size) || size < 64 || size > 2048)
    return invalid("size must be a whole number from 64 to 2048");
  const fg = params.get("fg")
    ? normalizeHex(`#${params.get("fg")!.replace(/^#/, "")}`)
    : (defaults.fg ?? "#0F172A");
  const bg = params.get("bg")
    ? normalizeHex(`#${params.get("bg")!.replace(/^#/, "")}`)
    : (defaults.bg ?? "#FFFFFF");
  if (!fg || !bg) return invalid("fg and bg must be hex colors, like 0F172A");
  const ec = (params.get("ec") ?? defaults.errorCorrection ?? "M").toUpperCase();
  if (!["L", "M", "Q", "H"].includes(ec)) return invalid("ec must be L, M, Q or H");
  return {
    data: defaults.data ?? "",
    format,
    size,
    fg,
    bg,
    errorCorrection: ec as ErrorCorrection,
  };
}

/** A plain (unstyled) QR image, rendered on the server. */
export async function qrImage(options: QrImageOptions): Promise<Response> {
  const settings = {
    margin: 4,
    width: options.size,
    errorCorrectionLevel: options.errorCorrection,
    color: { dark: options.fg, light: options.bg },
  } as const;
  // Byte mode with UTF-8 bytes, like the app's renderer, so any language scans correctly.
  const segments = [
    { data: Buffer.from(toUtf8BinaryString(options.data), "latin1"), mode: "byte" as const },
  ];
  try {
    if (options.format === "svg") {
      const svg = await QRCode.toString(segments, { ...settings, type: "svg" });
      return new Response(svg, {
        headers: {
          ...CORS_HEADERS,
          "content-type": "image/svg+xml",
          "cache-control": "public, max-age=300",
        },
      });
    }
    const png = await QRCode.toBuffer(segments, { ...settings, type: "png" });
    return new Response(new Uint8Array(png), {
      headers: {
        ...CORS_HEADERS,
        "content-type": "image/png",
        "cache-control": "public, max-age=300",
      },
    });
  } catch {
    return apiError(400, "invalid_request", "That content is too long for a QR code.");
  }
}
