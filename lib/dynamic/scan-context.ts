import { createHash } from "node:crypto";
import { UAParser } from "ua-parser-js";

import type { DeviceType } from "@/types/supabase";

// Link unfurlers, crawlers and scripts: redirect them, but don't count them as scans.
const BOT_PATTERN =
  /bot\b|crawl|spider|slurp|preview|facebookexternalhit|whatsapp\/|telegram|slack|discord|embedly|skypeuripreview|bitlybot|curl\/|wget\/|python-requests|go-http-client|okhttp|headlesschrome|lighthouse|monitor/i;

export interface ScanContext {
  visitorHash: string;
  isBot: boolean;
  country: string | null;
  region: string | null;
  city: string | null;
  deviceType: DeviceType;
  os: string | null;
  browser: string | null;
}

/** Cloudflare sends UTF-8 city names in headers that Node reads as Latin-1; undo that. */
export function decodeHeaderText(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const decoded = Buffer.from(trimmed, "latin1").toString("utf8");
    return decoded.includes("�") ? trimmed : decoded;
  } catch {
    return trimmed;
  }
}

export function clientIp(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/**
 * One-way, daily-rotating visitor ID: the same phone scanning twice today counts once as a
 * unique visitor, but the IP address can't be recovered and visitors can't be followed
 * across days.
 */
export function visitorHash(
  ip: string,
  userAgent: string,
  secret: string,
  now = new Date(),
): string {
  const day = now.toISOString().slice(0, 10);
  const salt = createHash("sha256").update(`${secret}:${day}`).digest("hex");
  return createHash("sha256").update(`${salt}|${ip}|${userAgent}`).digest("hex").slice(0, 32);
}

function deviceType(type: string | undefined, isBot: boolean): DeviceType {
  if (isBot) return "other";
  if (type === "mobile" || type === "wearable") return "mobile";
  if (type === "tablet") return "tablet";
  if (type === undefined) return "desktop";
  return "other";
}

export function scanContext(headers: Headers, secret: string, now = new Date()): ScanContext {
  const userAgent = headers.get("user-agent") ?? "";
  const isBot = !userAgent || BOT_PATTERN.test(userAgent);
  const ua = new UAParser(userAgent).getResult();
  const country = headers.get("cf-ipcountry")?.toUpperCase() ?? null;

  return {
    visitorHash: visitorHash(clientIp(headers), userAgent, secret, now),
    isBot,
    country: country && /^[A-Z]{2}$/.test(country) && country !== "XX" ? country : null,
    region: decodeHeaderText(headers.get("cf-region")),
    city: decodeHeaderText(headers.get("cf-ipcity")),
    deviceType: deviceType(ua.device.type, isBot),
    os: ua.os.name ?? null,
    browser: ua.browser.name ?? null,
  };
}
